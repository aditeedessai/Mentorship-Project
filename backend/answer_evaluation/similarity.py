"""
backend.answer_evaluation.similarity

Handles concept-level extraction, semantic coverage matching, and
lexical cheat detection (keyword stuffing / word salad), plus the
negation-shift and causal-clause helpers used by evaluator.py.
"""

import re
import logging

from sentence_transformers import util
from backend.answer_evaluation.sbert_model import get_embedding, get_embeddings_batch

logger = logging.getLogger(__name__)

# --- spaCy (optional, local/free) ---------------------------------------
# Used to REPLACE two regex/word-list heuristics with a real dependency
# parse: keyword-salad structure detection (_has_syntactic_structure_spacy)
# and negation detection (detect_negation_shift_spacy). Both callers keep
# the original regex/word-list version as a fallback, so behavior degrades
# gracefully rather than breaking if spaCy or its model isn't installed.
# Install with: `pip install spacy` then `python -m spacy download en_core_web_sm`
#
# Loaded LAZILY (on first actual call to a spaCy-backed function) rather
# than at import time, for the same reason the transformer models in
# sbert_model.py are lazy - importing this module shouldn't pay spaCy's
# model-load cost before anything has actually asked for a dependency parse.
_nlp = None
_HAS_SPACY = None  # tri-state: None=not attempted yet, True/False after


def _get_spacy_nlp():
    global _nlp, _HAS_SPACY
    if _HAS_SPACY is not None:
        return _nlp if _HAS_SPACY else None
    try:
        import spacy
        try:
            _nlp = spacy.load("en_core_web_sm")
            _HAS_SPACY = True
        except OSError:  # pragma: no cover
            _nlp = None
            _HAS_SPACY = False
            logger.warning(
                "similarity.py: spaCy model 'en_core_web_sm' not found - "
                "run `python -m spacy download en_core_web_sm`. Falling back "
                "to the regex/word-list heuristics."
            )
    except ImportError:  # pragma: no cover
        _nlp = None
        _HAS_SPACY = False
        logger.warning(
            "similarity.py: 'spacy' package not installed - falling back to "
            "the regex/word-list heuristics. Run `pip install spacy` and "
            "`python -m spacy download en_core_web_sm`."
        )
    return _nlp if _HAS_SPACY else None


_STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "to", "of", "in", "on", "at", "by", "for", "with", "about", "as",
    "and", "or", "but", "if", "then", "than", "so", "that", "this",
    "these", "those", "it", "its", "their", "his", "her", "they",
    "he", "she", "we", "you", "i", "not", "no", "do", "does", "did",
    "will", "would", "shall", "should", "can", "could", "may", "might",
    "must", "has", "have", "had", "which", "what", "when", "where",
    "who", "how", "into", "before", "after", "during", "while",
}

# Requires a materially closer embedding match before crediting a concept
# as "covered" - topically-related-but-wrong words ("velocity" vs
# "acceleration") should NOT count as a covered concept just because they
# sit in the same neighborhood of embedding space.
_CONCEPT_MATCH_THRESHOLD = 0.55
_STOPWORD_RATIO_THRESHOLD = 0.10
_KEYWORD_DENSITY_THRESHOLD = 0.85
_WORDS_PER_CONCEPT_THRESHOLD = 1.8

# Most keyword-stuffed answers are short (8-10 word) run-on term dumps, so
# the density/stopword signals need a low floor to get a chance to fire.
_MIN_WORDS_FOR_RATIO_SIGNALS = 6

# Brevity ("words_per_concept") is a WEAK/corroborating signal only. It is
# deliberately gated behind a higher word-count floor than the other Group A
# checks so that short-but-correct concise answers are never penalized for
# brevity alone.
_MIN_WORDS_FOR_PADDING_SIGNAL = 12

_EXPLANATORY_CONNECTORS = [
    "because", "therefore", "thus", "hence", "since", "so that",
    "results in", "resulting", "leads to", "leading to", "causes",
    "caused by", "due to", "which means", "means that", "in order to",
    "as a result", "consequently", "this means", "for example",
    "such as", "in other words", "which is why", "that is why",
]
_CONNECTOR_MIN_WORDS = 10
_VERBATIM_OVERLAP_RATIO_THRESHOLD = 0.60
_VERBATIM_MIN_RUN_LENGTH = 4
_FRAGMENT_MIN_CLAUSE_WORDS = 4
_FRAGMENT_CHECK_MIN_WORDS = 7
_STUFFING_MIN_SIGNALS_B = 2

# A deliberately organized, comma-delimited list of short terms/phrases
# ("photosynthesis, chloroplasts, light energy, carbon dioxide...") reads as
# a genuine (if telegraphic) outline of understanding, not a cheat attempt.
# An unpunctuated run-on of the same words reads as a dump. Commas are the
# cheapest, most reliable signal available to tell the two apart without a
# parser.
_LIST_MIN_SEGMENTS = 3          # i.e. at least 2 commas
_LIST_MAX_AVG_SEGMENT_WORDS = 6
_LIST_MIN_SHORT_SEGMENT_RATIO = 0.7
_LIST_MAX_SEGMENT_WORDS = 5

_DANGLING_ENDERS = {
    "if", "and", "or", "but", "so", "because", "when", "that", "which",
    "to", "the", "a", "an", "of", "in", "on", "for", "with", "while",
    "so that", "as",
}


def has_causal_connector(text: str) -> bool:
    """
    True if the text contains an explanatory/causal connector ("because",
    "therefore", "leads to", "due to", ...). This is the gate used to
    route answers to the LLM logic-check WITHOUT touching other
    categories: plain factual restatements, keyword lists, casual
    paraphrases, and typo-laden-but-simple answers essentially never use
    this kind of language, while an answer that explains WHY something
    happens - correctly or with inverted causality - always does.
    """
    if not text:
        return False
    lower = text.lower()
    return any(c in lower for c in _EXPLANATORY_CONNECTORS)


def extract_key_concepts(reference_answer: str, max_bigrams: int = 6) -> list:
    """Extracts key terms and bigram phrases from the reference answer."""
    words = re.findall(r"[a-zA-Z][a-zA-Z\-]*", reference_answer.lower())
    unigrams = {w for w in words if w not in _STOPWORDS and len(w) > 2}

    bigrams = set()
    for i in range(len(words) - 1):
        w1, w2 = words[i], words[i + 1]
        if w1 not in _STOPWORDS and w2 not in _STOPWORDS and len(w1) > 2 and len(w2) > 2:
            bigrams.add(f"{w1} {w2}")

    top_bigrams = sorted(bigrams, key=len, reverse=True)[:max_bigrams]
    return top_bigrams + sorted(unigrams)


def concept_coverage_score(student_answer: str, reference_answer: str) -> dict:
    """
    Calculates concept coverage using exact match and bi-encoder semantic
    similarity.

    SPEED: unmatched concepts are collected first and embedded in ONE
    batched call via get_embeddings_batch(), then compared against the
    (also separately batched) student embedding - a single forward pass
    over N+1 texts instead of N+1 separate calls.
    """
    concepts = extract_key_concepts(reference_answer)
    if not concepts:
        return {"coverage_score": 1.0, "matched": [], "missed": []}

    student_lower = student_answer.lower()
    matched, missed = [], []

    # Exact substring matches don't need an embedding at all - skip them
    # up front so only the concepts that actually need semantic
    # comparison go into the batch.
    concepts_needing_embedding = []
    for concept in concepts:
        if concept in student_lower:
            matched.append(concept)
        else:
            concepts_needing_embedding.append(concept)

    if concepts_needing_embedding:
        student_embedding = get_embedding(student_answer)
        concept_embeddings = get_embeddings_batch(concepts_needing_embedding)
        sims = util.cos_sim(concept_embeddings, student_embedding).squeeze(-1)
        for concept, sim in zip(concepts_needing_embedding, sims.tolist()):
            if sim >= _CONCEPT_MATCH_THRESHOLD:
                matched.append(concept)
            else:
                missed.append(concept)

    coverage_score = len(matched) / len(concepts)
    return {
        "coverage_score": round(coverage_score, 3),
        "matched": matched,
        "missed": missed,
    }


def _longest_common_run(a: list, b: list) -> int:
    """Calculates longest run of consecutive words shared between two token lists."""
    if not a or not b:
        return 0
    m, n = len(a), len(b)
    prev = [0] * (n + 1)
    best = 0
    for i in range(1, m + 1):
        curr = [0] * (n + 1)
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                curr[j] = prev[j - 1] + 1
                best = max(best, curr[j])
        prev = curr
    return best


def _has_list_structure(student_answer: str) -> bool:
    """
    Detects a deliberately organized, comma-delimited list of short terms
    (e.g. "photosynthesis, chloroplasts, light energy, carbon dioxide,
    water, glucose, oxygen production.") as distinct from an unpunctuated
    keyword dump. Requires at least two commas (3+ segments) AND most
    segments to be short, so ordinary sentences with a stray comma or two
    ("Because X, Y happens because Z.") are not misclassified as lists.
    """
    segments = [s.strip() for s in re.split(r",", student_answer) if s.strip()]
    if len(segments) < _LIST_MIN_SEGMENTS:
        return False

    seg_word_counts = [len(re.findall(r"[a-zA-Z][a-zA-Z\-]*", s)) for s in segments]
    seg_word_counts = [c for c in seg_word_counts if c > 0]
    if not seg_word_counts:
        return False

    avg_len = sum(seg_word_counts) / len(seg_word_counts)
    short_ratio = sum(1 for c in seg_word_counts if c <= _LIST_MAX_SEGMENT_WORDS) / len(seg_word_counts)

    return avg_len <= _LIST_MAX_AVG_SEGMENT_WORDS and short_ratio >= _LIST_MIN_SHORT_SEGMENT_RATIO


def _has_syntactic_structure_spacy(text: str):
    """
    Replaces the regex "clause = 4+ word run between sentence punctuation"
    proxy for has_complete_clause with a real dependency parse. A genuine
    sentence has a finite verb (a ROOT token that's a VERB/AUX) with at
    least one real dependent - a comma/space-separated term dump never
    does, even on the rare occasion it contains a stray stopword or a long
    segment that would fool the old regex proxy. Returns True/False, or
    None if spaCy/model isn't available so the caller can fall back to the
    regex heuristic.
    """
    nlp = _get_spacy_nlp()
    if nlp is None or not text or not text.strip():
        return None
    doc = nlp(text)
    for sent in doc.sents:
        root = None
        for token in sent:
            if token.dep_ == "ROOT":
                root = token
                break
        if root is None or root.pos_ not in ("VERB", "AUX"):
            continue
        if any(child.pos_ != "PUNCT" for child in root.children):
            return True
    return False


def _is_truncated(student_answer: str, words: list) -> bool:
    """Detects incomplete or abruptly cut-off answers."""
    stripped = student_answer.strip()
    if not stripped or stripped[-1] in ".!?":
        return False
    return bool(words) and words[-1] in _DANGLING_ENDERS


def detect_keyword_stuffing(student_answer: str, reference_answer: str, matched_concepts: list) -> dict:
    """Flags lexical keyword stuffing or unstructured word dumps."""
    words = re.findall(r"[a-zA-Z][a-zA-Z\-]*", student_answer.lower())
    reference_words = re.findall(r"[a-zA-Z][a-zA-Z\-]*", reference_answer.lower())

    empty_result = {
        "is_stuffing": False,
        "signals_triggered": [],
        "signal_count": 0,
        "group_a_triggered": False,
        "group_b_triggered": False,
        "stopword_ratio": 0.0,
        "keyword_density": 0.0,
        "words_per_concept": None,
        "verbatim_overlap_ratio": 0.0,
        "has_list_structure": False,
        "possibly_truncated": False,
    }

    if not words:
        return empty_result

    if _is_truncated(student_answer, words):
        result = dict(empty_result)
        result["possibly_truncated"] = True
        return result

    stopword_count = sum(1 for w in words if w in _STOPWORDS)
    stopword_ratio = stopword_count / len(words)

    clauses = re.split(r"[.!?]+", student_answer)
    has_complete_clause_regex = any(
        len(re.findall(r"[a-zA-Z][a-zA-Z\-]*", c)) >= _FRAGMENT_MIN_CLAUSE_WORDS for c in clauses
    )
    # Prefer the spaCy dependency-parse structure check over the regex
    # word-count proxy when available.
    spacy_structure = _has_syntactic_structure_spacy(student_answer)
    has_complete_clause = spacy_structure if spacy_structure is not None else has_complete_clause_regex

    # A deliberately organized comma list counts as "well formed" for
    # stuffing-detection purposes even though it isn't a full sentence -
    # it reflects genuine (if telegraphic) understanding, not a cheat.
    has_list_structure = _has_list_structure(student_answer)
    well_formed = ((stopword_ratio >= _STOPWORD_RATIO_THRESHOLD) and has_complete_clause) or has_list_structure
    sufficient_length = len(words) >= _MIN_WORDS_FOR_RATIO_SIGNALS

    # Group A: Word Salad / Unstructured Density Checks
    signal_stopword = stopword_ratio < _STOPWORD_RATIO_THRESHOLD and not has_list_structure

    reference_terms = {w for w in reference_words if w not in _STOPWORDS and len(w) > 2}
    unique_student_words = {w for w in words if w not in _STOPWORDS and len(w) > 2}
    keyword_density = (
        len(unique_student_words & reference_terms) / len(unique_student_words)
        if unique_student_words else 0.0
    )
    signal_density = (
        not well_formed and sufficient_length and keyword_density > _KEYWORD_DENSITY_THRESHOLD
    )

    # Brevity/padding signal: deliberately gated behind a stricter word-count
    # floor (_MIN_WORDS_FOR_PADDING_SIGNAL) than the other Group A checks, and
    # it can never trigger is_stuffing by itself (see group_a_triggered below)
    # - it only ever corroborates an already-present density signal. This
    # keeps short-but-correct concise answers from being penalized for
    # brevity alone.
    matched_words_union = set()
    for c in (matched_concepts or []):
        matched_words_union.update(c.split())
    matched_word_count = len(matched_words_union)

    sufficient_length_for_padding = len(words) >= _MIN_WORDS_FOR_PADDING_SIGNAL
    if matched_word_count > 0 and sufficient_length_for_padding:
        words_per_concept = len(words) / matched_word_count
        signal_padding = (not well_formed) and words_per_concept < _WORDS_PER_CONCEPT_THRESHOLD
    else:
        words_per_concept = (len(words) / matched_word_count) if matched_word_count > 0 else None
        signal_padding = False

    group_a_signals = []
    if signal_stopword:
        group_a_signals.append("stopword_ratio")
    if signal_density:
        group_a_signals.append("keyword_density")
    if signal_padding:
        group_a_signals.append("words_per_concept")

    # A run of 6+ words with virtually NO function words is, by itself, a
    # strong signature of an unstructured term dump - even when a couple
    # of off-topic words dilute keyword_density below the strict 0.85
    # anchor used above. Still gated on the clause check having failed, so
    # a genuinely well-formed sentence that's just light on the fixed
    # _STOPWORDS list (e.g. built around "whereas"/"using") isn't caught.
    signal_zero_function_words = (
        signal_stopword and sufficient_length and not has_list_structure
        and keyword_density > 0.5 and not has_complete_clause
    )
    if signal_zero_function_words:
        group_a_signals.append("near_zero_function_words")

    group_a_triggered = (signal_density and (signal_stopword or signal_padding)) or signal_zero_function_words

    # Group B: Copy-Paste & Fragment Checks
    has_connector = has_causal_connector(student_answer)
    signal_no_connector = (
        not well_formed and not has_connector and len(words) >= _CONNECTOR_MIN_WORDS
    )

    longest_run = _longest_common_run(words, reference_words)
    verbatim_overlap_ratio = longest_run / len(words) if words else 0.0
    signal_verbatim = (
        longest_run >= _VERBATIM_MIN_RUN_LENGTH
        and verbatim_overlap_ratio > _VERBATIM_OVERLAP_RATIO_THRESHOLD
    )

    signal_fragment = (
        not well_formed and not has_complete_clause and len(words) > _FRAGMENT_CHECK_MIN_WORDS
    )

    group_b_signals = []
    if signal_no_connector:
        group_b_signals.append("no_explanatory_connector")
    if signal_verbatim:
        group_b_signals.append("verbatim_overlap")
    if signal_fragment:
        group_b_signals.append("sentence_fragment")
    # signal_no_connector and signal_fragment are NOT independent - both
    # are gated behind the same "not well_formed" condition, so on any
    # answer without causal language they fire together or not at all.
    # Requiring signal_verbatim to be part of whatever combination
    # triggers Group B means a real second, independent signal is needed -
    # not just two facets of the same underlying "isn't a complete
    # sentence" observation.
    group_b_triggered = signal_verbatim and len(group_b_signals) >= _STUFFING_MIN_SIGNALS_B

    return {
        "is_stuffing": group_a_triggered or group_b_triggered,
        "signals_triggered": group_a_signals + group_b_signals,
        "signal_count": len(group_a_signals) + len(group_b_signals),
        "group_a_triggered": group_a_triggered,
        "group_b_triggered": group_b_triggered,
        "stopword_ratio": round(stopword_ratio, 3),
        "keyword_density": round(keyword_density, 3),
        "words_per_concept": round(words_per_concept, 3) if words_per_concept is not None else None,
        "verbatim_overlap_ratio": round(verbatim_overlap_ratio, 3),
        "has_list_structure": has_list_structure,
        "possibly_truncated": False,
    }


# Universal logical negation / reversal modifiers (domain-agnostic). Used as
# one of the routing signals for the LLM-judge fallback: if the student
# introduces a negation/reversal word that is absent from the reference,
# that's a strong hint of inverted logic worth a second (LLM) opinion.
_UNIVERSAL_NEGATION_WORDS = {
    "not", "no", "never", "none", "neither", "nor", "cannot", "cant",
    "stops", "stop", "prevent", "prevents", "avoid", "avoids", "halt",
    "halts", "opposite", "instead", "fails", "fail", "unable", "without",
    "disables", "disable", "rejects", "reject",
}


def detect_generic_negation_shift(student_answer: str, reference_answer: str) -> bool:
    """
    Subject-agnostic polarity check: flags whether the student answer
    introduces strong negation/reversal terms that are absent from the
    reference answer - a cheap, domain-agnostic hint of inverted logic.

    This is the word-list fallback for detect_negation_shift_spacy below;
    kept as its own function (rather than folded in) so callers still
    have a pure, dependency-free option and so behavior degrades
    gracefully when spaCy isn't installed.
    """
    student_words = set(re.findall(r"[a-zA-Z][a-zA-Z\-]*", student_answer.lower()))
    reference_words = set(re.findall(r"[a-zA-Z][a-zA-Z\-]*", reference_answer.lower()))

    student_negations = student_words & _UNIVERSAL_NEGATION_WORDS
    reference_negations = reference_words & _UNIVERSAL_NEGATION_WORDS

    return len(student_negations - reference_negations) > 0


def _negated_concept_heads_spacy(text: str):
    """
    Returns the set of head-token lemmas that a grammatical negation
    attaches to in `text` (e.g. "does not increase" -> {"increase"}),
    using spaCy's 'neg' dependency label plus a small set of
    grammaticalized negators ("never", "cannot", "none"...) that spaCy
    tags as ROOT/aux modifiers rather than 'neg'. Returns None if
    spaCy/model isn't available.
    """
    nlp = _get_spacy_nlp()
    if nlp is None or not text:
        return None
    doc = nlp(text)
    negated_heads = set()
    for token in doc:
        if token.dep_ == "neg":
            negated_heads.add(token.head.lemma_.lower())
        elif token.lemma_.lower() in ("never", "cannot", "none", "neither", "nor"):
            negated_heads.add(token.head.lemma_.lower())
    return negated_heads


def detect_negation_shift_spacy(student_answer: str, reference_answer: str):
    """
    Replaces detect_generic_negation_shift's flat word-set lookup with a
    dependency-parse check. Instead of asking "did a negation WORD appear
    that isn't anywhere in the reference" (which false-positives on e.g. a
    reference that itself uses "not" in an unrelated clause, and can't
    tell WHAT is being negated), this asks "is a negation grammatically
    attached to a concept-head that the reference doesn't negate" - a
    materially more precise version of the same idea. Returns True/False,
    or None if spaCy/model isn't available so the caller can fall back to
    detect_generic_negation_shift.
    """
    student_heads = _negated_concept_heads_spacy(student_answer)
    reference_heads = _negated_concept_heads_spacy(reference_answer)
    if student_heads is None or reference_heads is None:
        return None
    return len(student_heads - reference_heads) > 0


def split_causal_clauses(text: str):
    """
    Splits a causal/explanatory sentence into (premise, conclusion) on the
    first _EXPLANATORY_CONNECTORS match found, e.g. "Because X, Y happens"
    -> ("X", "Y happens"); "Y happens because X" -> ("Y happens", "X").
    Feeds sbert_model.clause_entailment_check, which doesn't care about
    premise/conclusion order (it checks contradiction_prob both ways).
    Returns (None, None) if no connector is found or the clauses can't be
    cleanly split.
    """
    if not text:
        return None, None

    lower = text.lower()
    best = None
    for connector in _EXPLANATORY_CONNECTORS:
        idx = lower.find(connector)
        if idx != -1 and (best is None or idx < best[0]):
            best = (idx, connector)
    if best is None:
        return None, None

    idx, connector = best
    before = text[:idx].strip(" ,.")
    after = text[idx + len(connector):].strip(" ,.")

    if before and after:
        return before, after
    if after:
        # Connector opened the sentence ("Because X, Y happens") - split
        # the remainder on its first comma into (premise, conclusion).
        parts = after.split(",", 1)
        if len(parts) == 2 and parts[0].strip() and parts[1].strip():
            return parts[0].strip(), parts[1].strip()
    return None, None