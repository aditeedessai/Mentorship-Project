"""
backend.answer_evaluation.sbert_model

Loads and exposes the models used for answer evaluation:

  - bi_encoder   : SentenceTransformer('BAAI/bge-large-en-v1.5')
                   Used for concept-level embedding similarity. bge-large
                   is materially stronger than MiniLM on casual/informal
                   paraphrase, which is where a weaker model under-matches
                   concepts in loose, conversational student answers.

  - cross_encoder: CrossEncoder('cross-encoder/stsb-roberta-base')
                   Primary semantic-correctness scorer (0-1).

  - nli_model    : CrossEncoder('MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli')
                   A dedicated, LOCAL entailment/contradiction model
                   (trained on MNLI + Fever-NLI + ANLI) that is far more
                   reliable than lexical negation-word spotting at catching
                   "sounds similar but says the opposite" answers in
                   informal text. This runs on every answer as a cheap,
                   fast first-pass signal; only genuinely ambiguous cases
                   escalate to the LLM judge (see llm_judge.py), so most
                   contradictions never need to leave the box.

  - hallucination_model: HHEM ('vectara/hallucination_evaluation_model')
                   Only ever invoked when concept_score/semantic_score is
                   already high (see the HALLUCINATION_*_GATE_THRESHOLD
                   constants in evaluator.py) - most answers never touch it.

------------------------------------------------------------------------
LAZY LOADING - models load ONCE, on first use, and are cached
------------------------------------------------------------------------
Every model here is a module-level singleton behind a `_get_*()` function.
The FIRST call to any evaluation function pays the (slow) model-load cost
for whichever model it needs; every call after that - across the whole
lifetime of the FastAPI process - reuses the already-loaded model object
in memory. Nothing is re-loaded per request, per answer, or per batch.
Concretely:
  - A run that never hits the hallucination gate never loads HHEM at all.
  - Server startup returns almost instantly; the first real cost is paid
    exactly once, right before whichever model is needed first.
  - Re-running the process still benefits from the OS-level Hugging Face
    Hub cache on disk the same as before - lazy loading only removes
    redundant *up-front* / *per-call* loading, it doesn't change on-disk
    caching.
------------------------------------------------------------------------
"""

import os
import warnings
import logging

# --- Quiet third-party console noise -------------------------------------
# huggingface_hub/transformers print their own progress bars ("Loading
# weights: 100%|...|") and advisory warnings (e.g. the HHEMv2Config/HHEMv2
# architecture notice) straight to the console during model loading. These
# are set as early as possible - before any transformers/sentence-
# transformers import triggers a model load - so they're suppressed for
# the whole process lifetime. A single friendly "Loading..." print (added
# in each _get_*() function below) replaces them so there's still visible
# feedback while a model loads for the first time.
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

try:
    from huggingface_hub.utils import disable_progress_bars as _hf_disable_progress_bars
    _hf_disable_progress_bars()
except Exception:  # pragma: no cover - best-effort, never block startup on this
    pass

try:
    from transformers.utils import logging as _hf_logging
    _hf_logging.set_verbosity_error()
    _hf_logging.disable_progress_bar()
except Exception:  # pragma: no cover
    pass

warnings.filterwarnings("ignore", module="transformers")

logger = logging.getLogger(__name__)

# Label order for MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli is
# ["entailment", "neutral", "contradiction"].
_NLI_MODEL_NAME = "MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli"
_NLI_LABELS = ["entailment", "neutral", "contradiction"]
_HALLUCINATION_MODEL_NAME = "vectara/hallucination_evaluation_model"

# Lazy singleton caches - populated on first use by the _get_* functions
# below. None means "not loaded yet" (or, for hallucination_model,
# possibly "tried and failed" - see _HAS_HALLUCINATION_MODEL).
_bi_encoder = None
_cross_encoder = None
_nli_model = None
_hallucination_model = None
_HAS_HALLUCINATION_MODEL = None  # tri-state: None=not attempted yet, True/False after

# Set to True to fully silence the console during model loading - no
# per-model prints and no single batch print from preload_models()
# either. The huggingface_hub/transformers progress bars and warnings
# are already suppressed separately, above, so with this on, model
# loading (lazy or via preload_models()) produces no console output at
# all. Flip back to False if you ever want the "Loading..." line back.
_SHOW_LOADING_MESSAGE = False


def _announce_loading():
    if _SHOW_LOADING_MESSAGE:
        print("Loading...")


def _get_bi_encoder():
    global _bi_encoder
    if _bi_encoder is None:
        _announce_loading()
        from sentence_transformers import SentenceTransformer
        logger.info("sbert_model.py: loading bi-encoder 'BAAI/bge-large-en-v1.5' (first use)...")
        _bi_encoder = SentenceTransformer("BAAI/bge-large-en-v1.5")
    return _bi_encoder


def _get_cross_encoder():
    global _cross_encoder
    if _cross_encoder is None:
        _announce_loading()
        from sentence_transformers import CrossEncoder
        logger.info("sbert_model.py: loading cross-encoder 'cross-encoder/stsb-roberta-base' (first use)...")
        _cross_encoder = CrossEncoder("cross-encoder/stsb-roberta-base")
    return _cross_encoder


def _get_nli_model():
    global _nli_model
    if _nli_model is None:
        _announce_loading()
        from sentence_transformers import CrossEncoder
        logger.info("sbert_model.py: loading NLI model '%s' (first use)...", _NLI_MODEL_NAME)
        _nli_model = CrossEncoder(_NLI_MODEL_NAME)
    return _nli_model


def _get_hallucination_model():
    """
    Loads HHEM on first use. Returns None (and only ever tries once) if
    loading fails, so callers degrade gracefully instead of retrying a
    slow failure on every single answer.

    NOTE: the current HHEM revision (v2.1, the default) is NOT a
    standard sentence-transformers CrossEncoder checkpoint - it ships a
    custom modeling class with its own bundled `.predict(pairs)` method
    and no separate tokenizer config, so it has to be loaded via
    transformers.AutoModelForSequenceClassification(trust_remote_code=True)
    directly rather than wrapped in CrossEncoder.
    """
    global _hallucination_model, _HAS_HALLUCINATION_MODEL
    if _HAS_HALLUCINATION_MODEL is not None:
        return _hallucination_model if _HAS_HALLUCINATION_MODEL else None

    _announce_loading()
    try:
        from transformers import AutoModelForSequenceClassification
        logger.info("sbert_model.py: loading hallucination model '%s' (first use)...", _HALLUCINATION_MODEL_NAME)
        _hallucination_model = AutoModelForSequenceClassification.from_pretrained(
            _HALLUCINATION_MODEL_NAME, trust_remote_code=True
        )
        _HAS_HALLUCINATION_MODEL = True
    except Exception as e:  # pragma: no cover
        logger.warning(
            "sbert_model.py: could not load hallucination model '%s' (%s) - "
            "the hallucination gate will be skipped.",
            _HALLUCINATION_MODEL_NAME, e,
        )
        _HAS_HALLUCINATION_MODEL = False
        _hallucination_model = None
    return _hallucination_model


def preload_models():
    """
    Eagerly loads all four models (bi-encoder, cross-encoder, NLI model,
    hallucination model) up front, in one call, instead of each
    lazy-loading separately on first use.

    Call this ONCE at process/service startup (e.g. at the top of
    run_main.py's main(), before the study flow begins) if you want all
    model-loading cost paid up front rather than scattered across the
    first few answers evaluated. This is entirely optional - nothing
    else in this module requires it.

    Console output is controlled by _SHOW_LOADING_MESSAGE above (off by
    default, so this - like lazy loading - now prints nothing).

    Safe to call more than once: every _get_*() function below is
    already guarded to load only once (see the module-level singleton
    caches), so a second preload_models() call is a fast no-op.
    """
    if _SHOW_LOADING_MESSAGE:
        print("Loading...")
    _get_bi_encoder()
    _get_cross_encoder()
    _get_nli_model()
    _get_hallucination_model()


def get_embedding(text: str):
    """
    Returns the bi-encoder embedding for a piece of text.
    Used by similarity.py for concept-level matching only.
    """
    return _get_bi_encoder().encode(text, convert_to_tensor=True)


def get_embeddings_batch(texts: list):
    """
    Batch version of get_embedding(): encodes MANY texts in a single
    forward pass instead of one .encode() call per text. SentenceTransformer
    .encode() already internally batches when given a list, so collecting
    all the text needed up front and calling this once pays a fraction of
    the Python/tokenization/model-call overhead N individual calls would.

    Returns a tensor of shape (len(texts), hidden_dim), in the same
    order as `texts`. Empty input returns an empty list (caller can
    still index/zip safely).
    """
    if not texts:
        return []
    return _get_bi_encoder().encode(list(texts), convert_to_tensor=True)


def semantic_correctness_score(student_answer: str, reference_answer: str) -> float:
    """
    Cross-encoder semantic correctness score (0-1) - judges whether the
    student's answer means the same thing as the reference answer,
    regardless of wording/structure.
    """
    return semantic_correctness_scores_batch([(student_answer, reference_answer)])[0]


def semantic_correctness_scores_batch(pairs: list) -> list:
    """
    Batch version of semantic_correctness_score(): scores MANY
    (student, reference) pairs in a single CrossEncoder.predict() call
    instead of one call per pair. `pairs` is a list of
    (student_answer, reference_answer) tuples; returns a list of floats
    in the same order, each clamped to [0, 1].
    """
    if not pairs:
        return []
    scores = _get_cross_encoder().predict(list(pairs))
    return [float(max(0.0, min(1.0, float(s)))) for s in scores]


def nli_contradiction_score(student_answer: str, reference_answer: str) -> dict:
    """
    Runs the local NLI checkpoint over (reference -> student) and returns
    the softmax'd probability distribution across entailment/neutral/
    contradiction, plus the argmax label.

    This is used as a fast, free, always-on pre-filter: if the model is
    confidently NOT contradictory, we skip the (slower, paid) LLM judge
    call entirely. If it's confidently contradictory, or genuinely
    unsure, evaluator.py escalates to the LLM judge for a final call.
    """
    return nli_contradiction_scores_batch([(reference_answer, student_answer)])[0]


def nli_contradiction_scores_batch(pairs: list) -> list:
    """
    Batch version of nli_contradiction_score(). `pairs` is a list of
    (premise, hypothesis) tuples - i.e. (reference_answer,
    student_answer) for the whole-answer contradiction pre-filter, or
    (premise_clause, conclusion_clause) for the clause-level check.
    Returns a list of result dicts in the same order, one NLI forward
    pass for the whole list instead of one call per pair.
    """
    if not pairs:
        return []
    import numpy as np

    logits = np.atleast_2d(_get_nli_model().predict(list(pairs)))
    # Row-wise softmax across the 3 NLI labels.
    exp = np.exp(logits - logits.max(axis=1, keepdims=True))
    probs = exp / exp.sum(axis=1, keepdims=True)

    results = []
    for row in probs:
        label_probs = {label: float(p) for label, p in zip(_NLI_LABELS, row)}
        predicted_label = _NLI_LABELS[int(row.argmax())]
        results.append({
            "predicted_label": predicted_label,
            "entailment_prob": round(label_probs["entailment"], 3),
            "neutral_prob": round(label_probs["neutral"], 3),
            "contradiction_prob": round(label_probs["contradiction"], 3),
        })
    return results


def clause_entailment_check(premise_clause: str, conclusion_clause: str) -> dict:
    """
    The SAME local NLI checkpoint used by nli_contradiction_score, but run
    at CLAUSE granularity instead of whole-answer granularity. evaluator.py
    calls this only when has_causal_connector() flags the student's answer
    as making an explicit causal claim (see similarity.split_causal_clauses
    for how the two clauses are extracted). Whole-answer NLI can miss
    inverted causality when the surrounding sentence still matches the
    reference's topic/vocabulary overall; checking whether the conclusion
    clause is actually entailed by the premise clause (rather than
    contradicting or being unrelated to it) is a more targeted check for
    "the individual claims are true but the reasoning between them is
    backwards."
    """
    return nli_contradiction_score(premise_clause, conclusion_clause)


def hallucination_consistency_score(reference_answer: str, student_answer: str):
    """
    HHEM consistency probability (0-1, where 1.0 = fully grounded in /
    consistent with the reference and 0.0 = hallucinated) for
    (reference_answer, student_answer). Returns None if the model isn't
    available so callers can skip the gate cleanly instead of crashing.
    Loads the model on first call - see _get_hallucination_model().
    """
    return hallucination_consistency_scores_batch([(reference_answer, student_answer)])[0]


def hallucination_consistency_scores_batch(pairs: list):
    """
    Batch version of hallucination_consistency_score(). `pairs` is a
    list of (reference_answer, student_answer) tuples. Returns a list
    of floats (or None entries if the model isn't available) in the
    same order, one HHEM call for the whole list instead of one call
    per pair.
    """
    if not pairs:
        return []
    model = _get_hallucination_model()
    if model is None:
        return [None] * len(pairs)
    # HHEM's predict() takes (premise, hypothesis) tuples and returns
    # scores directly (it handles its own tokenization internally) - no
    # separate tokenizer call needed, unlike a plain CrossEncoder.
    scores = model.predict(list(pairs))
    return [float(max(0.0, min(1.0, float(s)))) for s in scores]