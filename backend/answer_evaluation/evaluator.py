"""
backend.answer_evaluation.evaluator

Unified Answer Evaluation Engine.
Combines cross-encoder semantic scoring, concept coverage, human-writing
style tolerance (typo/contraction normalization), keyword-stuffing
penalties, a local NLI contradiction pre-filter, and an LLM-as-judge
fallback for hallucination/wrong-logic cases into continuous scores and
binary classification (is_correct).

------------------------------------------------------------------------
BACKWARD COMPATIBILITY NOTE
------------------------------------------------------------------------
`evaluate_answer(student_answer, reference_answer, max_marks)` keeps the
exact same positional call signature your routes already use, and the
returned dict still contains every key the old, simpler evaluator
returned (semantic_score, concept_score, final_score, marks_awarded,
matched_concepts, missed_concepts, keyword_stuffing_detected,
logic_inversion_detected, stuffing_signals) - nothing that reads those
fields needs to change. New fields (is_correct, nli_signal,
llm_judge_triggered, llm_judge_verdict, ...) are purely additive.

------------------------------------------------------------------------
ROUTING NOTE - LLM-as-judge fallback (highest-impact accuracy fix)
------------------------------------------------------------------------
The statistical pipeline (cross-encoder + concept coverage + stuffing
heuristics) is weakest on exactly two failure modes: fluent HALLUCINATION
(plausible technical vocabulary that doesn't actually say what the
reference says) and WRONG_LOGIC (individually-true claims stitched into
an inverted or broken causal relationship). Both can score deceptively
high on pure lexical/embedding similarity because the vocabulary overlap
is real even when the meaning isn't.

Rather than trust the similarity score blindly in these cases, we escalate
to an LLM judge (see llm_judge.py) ONLY when local signals say the answer
is ambiguous enough to be worth the extra latency/cost:

  - the pre-judge final_score falls in the borderline band
    [BORDERLINE_LOW, BORDERLINE_HIGH], where the statistical pipeline is
    least confident either way, OR
  - the local NLI checkpoint (sbert_model.nli_contradiction_score) flags a
    non-trivial contradiction probability, OR
  - the domain-agnostic divergence check fires (high concept-keyword
    overlap but a semantic score that doesn't back it up - the classic
    "right words, wrong claim" hallucination pattern), OR
  - a negation/reversal word appears in the student answer that is absent
    from the reference (a cheap, universal hint of inverted logic).

If the judge is invoked and returns a contradiction, a hallucinated claim,
or invalid logic, that verdict OVERRIDES the statistical score: is_correct
is forced to False and final_score is capped low, regardless of how high
the semantic/concept scores were. If the judge is unavailable (no API key,
network error, malformed response) the pipeline degrades gracefully back
to the pure statistical decision rather than failing the request.
------------------------------------------------------------------------
"""

import re
import logging

from backend.answer_evaluation.sbert_model import (
    semantic_correctness_score,
    nli_contradiction_score,
    clause_entailment_check,
    hallucination_consistency_score,
)
from backend.answer_evaluation.similarity import (
    concept_coverage_score,
    detect_keyword_stuffing,
    detect_generic_negation_shift,
    detect_negation_shift_spacy,
    has_causal_connector,
    split_causal_clauses,
)
from backend.answer_evaluation.normalization import normalize_text, extract_dynamic_protected_terms
from backend.answer_evaluation import llm_judge

logger = logging.getLogger(__name__)

CONCEPT_BONUS_WEIGHT = 0.15
CONCEPT_GATE_COVERAGE_THRESHOLD = 0.30
CONCEPT_GATE_SEMANTIC_THRESHOLD = 0.60
CONCEPT_GATE_PENALTY_MULTIPLIER = 0.80
STUFFING_PENALTY_MULTIPLIER = 0.50

# --- Negation trigger: NLI-informed local penalty ---------------------
# A flat, unconditional negation penalty makes EVERY negation-flagged
# answer permanently dependent on the LLM judge to pass - even correct
# ones (e.g. "UDP does NOT guarantee delivery"), since a blanket
# multiplier always drops final_score below threshold regardless of
# whether the negation was actually wrong. Instead:
#   - NLI corroborates a real contradiction (>= CONFIRM threshold) ->
#     apply the harsh penalty; the local pipeline is already confident,
#     no need to spend an LLM call confirming what NLI already caught.
#   - NLI sees no contradiction at all (< CLEAR threshold) -> the
#     negation heuristic likely matched benign phrasing (a negated
#     concept the reference just phrases differently); apply only a
#     light penalty so a genuinely correct negated answer isn't
#     automatically failed pending a rescue that may never come.
#   - Anywhere in between -> genuinely ambiguous; apply the light
#     penalty for now AND escalate to the LLM judge for a tie-break.
NEGATION_PENALTY_MULTIPLIER_CONFIRMED = 0.35
NEGATION_PENALTY_MULTIPLIER_UNCONFIRMED = 0.85
NEGATION_NLI_CONFIRM_THRESHOLD = 0.45
NEGATION_NLI_CLEAR_THRESHOLD = 0.18

# Threshold for binary classification (Correct vs Wrong)
CORRECTNESS_THRESHOLD = 0.55

# --- LLM-judge routing thresholds --------------------------------------
BORDERLINE_LOW = 0.51
BORDERLINE_HIGH = 0.62

# Domain-agnostic divergence: high concept/keyword overlap but the
# cross-encoder doesn't back up that the meaning actually matches - the
# classic "right words, wrong claim" hallucination/wrong-logic shape.
DIVERGENCE_CONCEPT_THRESHOLD = 0.25
DIVERGENCE_SEMANTIC_THRESHOLD = 0.60

# Near-perfect concept coverage combined with a semantic score that ISN'T
# near-perfect is itself a red flag pattern - every reference term shows
# up (or embeds close to something in the answer), but the cross-encoder
# still isn't fully convinced the meaning matches (e.g. a swapped
# formula). Routes on the concept/semantic GAP itself, independent of
# where semantic_score lands.
NEAR_PERFECT_CONCEPT_THRESHOLD = 0.92
NEAR_PERFECT_CONCEPT_SEMANTIC_GAP = 0.22

# Local NLI pre-filter: only escalate to the (slower, paid) LLM judge when
# the fast local model isn't already confidently clean.
NLI_CONTRADICTION_ROUTE_THRESHOLD = 0.45

# A causal answer the pipeline is ALREADY confident about (score
# comfortably above the pass threshold) doesn't need the LLM judge's
# confirmation just because it happens to say "because"; only escalate
# when the score isn't already a confident pass.
CAUSAL_LANGUAGE_ROUTE_CEILING = 0.68

# What the LLM verdict caps final_score at when it overrides the
# statistical pipeline.
LLM_OVERRIDE_SCORE_CAP = 0.30

# --- LLM-judge CONFIRMATION floor (symmetry) ------------------------------
# We only escalate to the judge because the statistical score was already
# ambiguous. If the LLM judge - which actually reads and understands the
# text - comes back and explicitly says "no contradiction, no
# hallucinated claim, logic valid," that IS the answer to the question we
# escalated to ask, and should be trusted the same way an override is
# trusted, just in the other direction (raises final_score to a floor
# instead of only ever being able to cap it).
LLM_CONFIRM_SCORE_FLOOR = 0.75

# --- Concise-style trigger: NLI entailment blend -------------------------
# Short answers are where the STS cross-encoder is least reliable (too
# little text for the "topical similarity" signal it was trained on to
# stabilize). Below the word-count floor, blend the local NLI
# entailment_prob (which doesn't degrade with sentence length) into
# semantic_score instead of trusting the cross-encoder alone.
CONCISE_WORD_COUNT_THRESHOLD = 15
CONCISE_NLI_BLEND_WEIGHT = 0.35

# --- Wrong_logic trigger: clause-level local NLI --------------------------
# Only computed when has_causal_connector() fires. A contradiction between
# the premise and conclusion clauses is a strong, free, local signal that
# the causal direction is inverted.
CLAUSE_NLI_CONTRADICTION_THRESHOLD = 0.45

# --- LOCAL NLI RESOLUTION (make the free pipeline strong on its own) -----
# The triggers above all fire because the EMBEDDING score is unsure - but
# the NLI model (already computed on every answer for free) frequently
# already has a clear opinion even when the embedding score doesn't. If
# NLI clearly says "this follows from the reference," trust it and lift
# the score directly instead of spending an LLM call to confirm what's
# already known for free. If NLI clearly says "this contradicts," trust
# that and penalize directly. Only genuinely NLI-ambiguous cases still
# reach the LLM judge.
LOCAL_NLI_ENTAILMENT_CONFIRM = 0.60
LOCAL_NLI_CONTRADICTION_CLEAR = 0.20
LOCAL_NLI_CONTRADICTION_CONFIRM = 0.45
LOCAL_CONFIRM_SCORE_FLOOR = 0.70
LOCAL_NLI_PENALTY_MULTIPLIER = 0.35

# --- Hallucinated trigger: HHEM gate ---------------------------------------
HALLUCINATION_CONCEPT_GATE_THRESHOLD = 0.70
HALLUCINATION_SEMANTIC_GATE_THRESHOLD = 0.70
HALLUCINATION_CONSISTENCY_THRESHOLD = 0.50


def _should_escalate_to_llm_judge(
    final_score: float,
    concept_score: float,
    semantic_score: float,
    has_negation_shift: bool,
    nli_result: dict,
    has_causal_language: bool,
    clause_nli_result: dict = None,
    hallucination_result: dict = None,
    nli_locally_resolved: bool = False,
    clause_nli_locally_resolved: bool = False,
) -> tuple:
    """Decides whether this answer is ambiguous enough to warrant the LLM
    judge, and returns (should_escalate: bool, reason: str | None)."""
    # An answer that explains WHY something happens ("because",
    # "therefore", "leads to"...) is making a causal claim - correct or
    # inverted - that the statistical pipeline cannot verify on its own.
    # Gated below CAUSAL_LANGUAGE_ROUTE_CEILING so an answer the pipeline
    # is ALREADY highly confident about doesn't get escalated just for
    # using "because". Also skipped when clause-level NLI already
    # confidently resolved the causal direction.
    if has_causal_language and final_score < CAUSAL_LANGUAGE_ROUTE_CEILING and not clause_nli_locally_resolved:
        return True, "causal_language_present"

    # The three triggers below all fire because the EMBEDDING score is
    # ambiguous. Skipped when whole-answer NLI already confidently
    # resolved the direction - trust the free local signal instead of
    # escalating just because the embedding score alone couldn't decide.
    if not nli_locally_resolved:
        if BORDERLINE_LOW <= final_score <= BORDERLINE_HIGH:
            return True, "borderline_score_band"

        if concept_score >= DIVERGENCE_CONCEPT_THRESHOLD and semantic_score < DIVERGENCE_SEMANTIC_THRESHOLD:
            return True, "concept_semantic_divergence"

        if (
            concept_score >= NEAR_PERFECT_CONCEPT_THRESHOLD
            and (concept_score - semantic_score) >= NEAR_PERFECT_CONCEPT_SEMANTIC_GAP
        ):
            return True, "near_perfect_concept_semantic_gap"

    if has_negation_shift:
        # Escalates only when NLI is genuinely ambiguous about whether the
        # negation is a real contradiction. When NLI already clearly
        # agrees or disagrees with the negation heuristic, the local
        # penalty logic in _compute_statistical_result already made the
        # confident call and doesn't need the LLM judge's help.
        contradiction_prob = nli_result.get("contradiction_prob") if nli_result else None
        if contradiction_prob is None or NEGATION_NLI_CLEAR_THRESHOLD <= contradiction_prob < NEGATION_NLI_CONFIRM_THRESHOLD:
            return True, "negation_shift_ambiguous"

    # Skipped when the local resolution logic above ALREADY confidently
    # penalized the answer via the exact same NLI contradiction signal -
    # avoids escalating an answer that's already been confidently
    # penalized locally for the same reason.
    if not nli_locally_resolved and nli_result and nli_result.get("contradiction_prob", 0.0) >= NLI_CONTRADICTION_ROUTE_THRESHOLD:
        return True, "nli_contradiction_signal"

    # Clause-level local NLI found the conclusion clause contradicts
    # (rather than follows from) the premise clause - a free, local, more
    # targeted signal of inverted causality than the whole-answer NLI
    # check above.
    if not clause_nli_locally_resolved and clause_nli_result and clause_nli_result.get("contradiction_prob", 0.0) >= CLAUSE_NLI_CONTRADICTION_THRESHOLD:
        return True, "clause_level_nli_contradiction"

    # High concept-keyword overlap (gated upstream) but the local HHEM
    # model isn't confident the claim is actually grounded in the
    # reference - the "right words, invented claim" shape.
    if hallucination_result and hallucination_result.get("flagged"):
        return True, "hallucination_signal"

    return False, None


def _compute_statistical_result(student_answer: str, reference_answer: str) -> dict:
    """
    Runs the full statistical pipeline (normalization, semantic score,
    concept coverage, stuffing detection, NLI pre-filter, score
    integration, and the escalation decision) WITHOUT calling the LLM
    judge. Shared by both evaluate_answer (single item, judge call
    inline) and evaluate_answers_batch (many items, judge calls batched
    together) so the statistical logic only lives in one place.
    """
    if not student_answer or not student_answer.strip():
        return {"empty": True}

    # Per-question dynamic term protection, derived once from the raw
    # reference answer and applied symmetrically to both normalize_text()
    # calls below (protection must be symmetric between student/reference).
    protected_terms = extract_dynamic_protected_terms(reference_answer)
    normalized_student = normalize_text(student_answer, protected_terms)
    normalized_reference = normalize_text(reference_answer, protected_terms)

    semantic_score = semantic_correctness_score(normalized_student, normalized_reference)

    concept_result = concept_coverage_score(normalized_student, normalized_reference)
    concept_score = concept_result["coverage_score"]

    stuffing_result = detect_keyword_stuffing(
        student_answer, reference_answer, concept_result["matched"]
    )
    is_stuffing = stuffing_result["is_stuffing"]

    # Prefer the spaCy dependency-parse check over the word-list heuristic
    # when available - it replaces rather than merely corroborates
    # detect_generic_negation_shift.
    spacy_negation_result = detect_negation_shift_spacy(normalized_student, normalized_reference)
    has_negation_shift = (
        spacy_negation_result if spacy_negation_result is not None
        else detect_generic_negation_shift(normalized_student, normalized_reference)
    )

    has_causal_language = has_causal_connector(student_answer)

    try:
        nli_result = nli_contradiction_score(normalized_student, normalized_reference)
    except Exception as e:  # pragma: no cover
        logger.warning("evaluator.py: NLI pre-filter failed (%s); continuing without it.", e)
        nli_result = None

    # Short answers lean harder on the local NLI entailment probability,
    # which doesn't degrade with sentence length the way the STS
    # cross-encoder's similarity signal does.
    student_word_count = len(re.findall(r"[a-zA-Z]+", student_answer))
    if student_word_count < CONCISE_WORD_COUNT_THRESHOLD and nli_result:
        semantic_score = (
            (1.0 - CONCISE_NLI_BLEND_WEIGHT) * semantic_score
            + CONCISE_NLI_BLEND_WEIGHT * nli_result["entailment_prob"]
        )
        semantic_score = max(0.0, min(1.0, semantic_score))

    # Only pay for clause-level NLI when the answer actually makes a
    # causal claim worth checking the direction of.
    clause_nli_result = None
    if has_causal_language:
        premise_clause, conclusion_clause = split_causal_clauses(normalized_student)
        if premise_clause and conclusion_clause:
            try:
                clause_nli_result = clause_entailment_check(premise_clause, conclusion_clause)
            except Exception as e:  # pragma: no cover
                logger.warning("evaluator.py: clause-level NLI check failed (%s); skipping it.", e)
                clause_nli_result = None

    # Only pay for the HHEM call when concept overlap OR semantic
    # similarity is already high enough that a hallucinated "right words,
    # invented claim" answer could otherwise slip through undetected.
    hallucination_result = None
    if concept_score >= HALLUCINATION_CONCEPT_GATE_THRESHOLD or semantic_score >= HALLUCINATION_SEMANTIC_GATE_THRESHOLD:
        try:
            consistency = hallucination_consistency_score(normalized_reference, normalized_student)
        except Exception as e:  # pragma: no cover
            logger.warning("evaluator.py: hallucination check failed (%s); skipping it.", e)
            consistency = None
        if consistency is not None:
            hallucination_result = {
                "consistency_score": round(consistency, 3),
                "flagged": consistency < HALLUCINATION_CONSISTENCY_THRESHOLD,
            }

    if is_stuffing:
        bonus = 0.0
    else:
        bonus = CONCEPT_BONUS_WEIGHT * concept_score * (1.0 - semantic_score)
    final_score = semantic_score + bonus

    if concept_score < CONCEPT_GATE_COVERAGE_THRESHOLD and semantic_score < CONCEPT_GATE_SEMANTIC_THRESHOLD:
        final_score *= CONCEPT_GATE_PENALTY_MULTIPLIER
    if is_stuffing:
        final_score *= STUFFING_PENALTY_MULTIPLIER
    if has_negation_shift:
        # NLI-informed penalty: use the free NLI contradiction signal to
        # decide how hard to penalize, rather than a flat multiplier that
        # would make every negation-flagged answer permanently dependent
        # on an LLM rescue to pass.
        contradiction_prob = nli_result.get("contradiction_prob") if nli_result else None
        if contradiction_prob is not None and contradiction_prob >= NEGATION_NLI_CONFIRM_THRESHOLD:
            final_score *= NEGATION_PENALTY_MULTIPLIER_CONFIRMED
        else:
            final_score *= NEGATION_PENALTY_MULTIPLIER_UNCONFIRMED
    final_score = max(0.0, min(1.0, final_score))

    # --- Local NLI resolution ------------------------------------------
    # Before treating the embedding score as "ambiguous" and reaching for
    # the LLM judge, check whether the free local NLI model already has a
    # clear opinion. This is what lets a genuinely correct but
    # loosely-worded paraphrase (moderate semantic/concept scores, but NLI
    # confidently sees entailment) get a confident local pass instead of
    # defaulting to an escalation every time the embedding score alone is
    # unsure.
    #
    # The entailment-confirm (score-raising) branch is skipped when
    # has_negation_shift is True, since it can otherwise conflict with
    # and override the more careful, negation-specific thresholds above
    # (a generic entailment bar could be more lenient than the
    # negation-specific logic would allow, boosting a genuinely wrong
    # negated answer to a pass). The contradiction-confirm (score-
    # lowering) branch is unaffected since it only ever agrees with,
    # never overrides, a stricter local penalty.
    nli_locally_resolved = False
    if nli_result:
        entail = nli_result.get("entailment_prob", 0.0)
        contra = nli_result.get("contradiction_prob", 0.0)
        if not has_negation_shift and entail >= LOCAL_NLI_ENTAILMENT_CONFIRM and contra < LOCAL_NLI_CONTRADICTION_CLEAR:
            final_score = max(final_score, LOCAL_CONFIRM_SCORE_FLOOR)
            nli_locally_resolved = True
        elif contra >= LOCAL_NLI_CONTRADICTION_CONFIRM:
            final_score *= LOCAL_NLI_PENALTY_MULTIPLIER
            nli_locally_resolved = True

    # Same idea, but using the more targeted CLAUSE-level NLI for the
    # causal-language trigger specifically - a clause-level read on the
    # premise/conclusion pair is more precise for "is this causal
    # direction valid" than the whole-answer NLI check above.
    clause_nli_locally_resolved = False
    if has_causal_language and clause_nli_result:
        c_entail = clause_nli_result.get("entailment_prob", 0.0)
        c_contra = clause_nli_result.get("contradiction_prob", 0.0)
        if c_entail >= LOCAL_NLI_ENTAILMENT_CONFIRM and c_contra < LOCAL_NLI_CONTRADICTION_CLEAR:
            final_score = max(final_score, LOCAL_CONFIRM_SCORE_FLOOR)
            clause_nli_locally_resolved = True
        elif c_contra >= LOCAL_NLI_CONTRADICTION_CONFIRM:
            final_score *= LOCAL_NLI_PENALTY_MULTIPLIER
            clause_nli_locally_resolved = True

    final_score = max(0.0, min(1.0, final_score))

    should_escalate, escalate_reason = (False, None)
    if not is_stuffing:
        should_escalate, escalate_reason = _should_escalate_to_llm_judge(
            final_score,
            concept_score,
            semantic_score,
            has_negation_shift,
            nli_result,
            has_causal_language,
            clause_nli_result,
            hallucination_result,
            nli_locally_resolved,
            clause_nli_locally_resolved,
        )

    # Backward-compat: the old, simpler evaluator exposed a single
    # "logic_inversion_detected" boolean. Reconstruct an equivalent
    # signal here from the richer local checks (negation shift and/or a
    # confidently-contradictory causal clause), before any LLM verdict is
    # known - _finalize_result folds in the LLM verdict afterward too.
    logic_inversion_detected = bool(has_negation_shift) or bool(
        clause_nli_result and clause_nli_result.get("contradiction_prob", 0.0) >= CLAUSE_NLI_CONTRADICTION_THRESHOLD
    )

    return {
        "empty": False,
        "normalized_student": normalized_student,
        "normalized_reference": normalized_reference,
        "semantic_score": semantic_score,
        "concept_score": concept_score,
        "concept_result": concept_result,
        "stuffing_result": stuffing_result,
        "is_stuffing": is_stuffing,
        "nli_result": nli_result,
        "clause_nli_result": clause_nli_result,
        "hallucination_result": hallucination_result,
        "has_negation_shift": has_negation_shift,
        "logic_inversion_detected": logic_inversion_detected,
        "final_score": final_score,
        "should_escalate": should_escalate,
        "escalate_reason": escalate_reason,
    }


def _finalize_result(stat: dict, llm_judge_verdict: dict, max_marks: float, pass_threshold: float) -> dict:
    """Builds the public result dict from a statistical-pipeline result
    plus an optional LLM-judge verdict (or None if not escalated)."""
    if stat.get("empty"):
        return {
            "semantic_score": 0.0,
            "concept_score": 0.0,
            "final_score": 0.0,
            "marks_awarded": 0.0,
            "is_correct": False,
            "matched_concepts": [],
            "missed_concepts": [],
            "keyword_stuffing_detected": False,
            "logic_inversion_detected": False,
            "stuffing_signals": [],
            "nli_signal": None,
            "clause_nli_signal": None,
            "hallucination_signal": None,
            "llm_judge_triggered": False,
            "llm_judge_reason": None,
            "llm_judge_verdict": None,
        }

    final_score = stat["final_score"]
    llm_judge_available = bool(llm_judge_verdict and llm_judge_verdict.get("judge_available"))
    llm_forced_incorrect = bool(llm_judge_verdict and llm_judge_verdict.get("override_to_incorrect"))

    if llm_forced_incorrect:
        final_score = min(final_score, LLM_OVERRIDE_SCORE_CAP)
    elif llm_judge_available and not stat["is_stuffing"]:
        # The LLM judge was asked specifically because the statistical
        # score was ambiguous. A clean verdict (no contradiction, no
        # hallucinated claim, valid logic) is a positive confirmation,
        # not a no-op - use it as a floor the same way a bad verdict is
        # used as a ceiling. Skipped for is_stuffing items because the
        # judge's questions (contradiction / hallucination / logic
        # validity) say nothing about whether the text is a genuine
        # sentence vs. a keyword dump.
        final_score = max(final_score, LLM_CONFIRM_SCORE_FLOOR)
    final_score = max(0.0, min(1.0, final_score))
    marks_awarded = round(final_score * max_marks, 2)

    is_correct = (final_score >= pass_threshold) and (not stat["is_stuffing"]) and (not llm_forced_incorrect)

    # Backward-compat: fold the LLM judge's verdict into the same
    # logic_inversion_detected flag the local signals already produced,
    # so callers reading only that one field still see the full picture.
    logic_inversion_detected = bool(stat.get("logic_inversion_detected")) or bool(
        llm_judge_verdict and (
            llm_judge_verdict.get("contradicts_reference") or llm_judge_verdict.get("logic_valid") is False
        )
    )

    return {
        "semantic_score": round(stat["semantic_score"], 3),
        "concept_score": round(stat["concept_score"], 3),
        "final_score": round(final_score, 3),
        "marks_awarded": marks_awarded,
        "is_correct": is_correct,
        "matched_concepts": stat["concept_result"]["matched"],
        "missed_concepts": stat["concept_result"]["missed"],
        "keyword_stuffing_detected": stat["is_stuffing"],
        "logic_inversion_detected": logic_inversion_detected,
        "stuffing_signals": stat["stuffing_result"]["signals_triggered"],
        "nli_signal": stat["nli_result"],
        "clause_nli_signal": stat["clause_nli_result"],
        "hallucination_signal": stat["hallucination_result"],
        "llm_judge_triggered": stat["should_escalate"],
        "llm_judge_reason": stat["escalate_reason"],
        "llm_judge_verdict": llm_judge_verdict,
    }


def evaluate_answer(
    student_answer: str,
    reference_answer: str,
    max_marks: float = 10.0,
    pass_threshold: float = CORRECTNESS_THRESHOLD,
    use_llm_judge: bool = True,
) -> dict:
    """
    Evaluates a SINGLE student answer against a reference answer, calling
    the LLM judge inline (one API call) if escalation is warranted.

    Existing call sites using the old 3-positional-arg style
    (student_answer, reference_answer, max_marks) keep working exactly as
    before - the two new parameters are keyword-only-by-convention and
    both have safe defaults. For grading many answers at once, prefer
    evaluate_answers_batch() - it batches all escalated judge calls
    together into far fewer API round-trips.

    Args:
        use_llm_judge: set False to skip the LLM-judge escalation
            entirely. The statistical pipeline still runs in full either
            way, so scoring stays deterministic/free if you need it to.

    Returns dict - see module docstring / evaluate_answers_batch for
    field details.
    """
    stat = _compute_statistical_result(student_answer, reference_answer)
    if stat.get("empty"):
        return _finalize_result(stat, None, max_marks, pass_threshold)

    llm_judge_verdict = None
    if use_llm_judge and stat["should_escalate"]:
        if llm_judge.is_available():
            llm_judge_verdict = llm_judge.judge_answer(stat["normalized_student"], stat["normalized_reference"])
        else:
            llm_judge_verdict = {"judge_available": False, "error": "llm_judge_unavailable"}

    return _finalize_result(stat, llm_judge_verdict, max_marks, pass_threshold)


def evaluate_answers_batch(
    items: list,
    max_marks: float = 10.0,
    pass_threshold: float = CORRECTNESS_THRESHOLD,
    use_llm_judge: bool = True,
) -> list:
    """
    Evaluates MANY (student_answer, reference_answer) pairs at once,
    batching all escalated LLM-judge calls together into a small number
    of API round-trips instead of one call per escalated item. This is
    the main lever for making a large bulk grading run fast under a
    rate-limited free tier: instead of many individually throttled
    calls, escalated items go out in a handful of grouped requests (see
    llm_judge.judge_batch / JUDGE_BATCH_SIZE).

    Args:
        items: list of {"student": str, "reference": str} dicts, in the
            order results should come back in.
        use_llm_judge: set False to skip the LLM-judge escalation
            entirely for every item.

    Returns:
        list of result dicts, same shape/order as `items`, each identical
        to what evaluate_answer() would return for that pair.
    """
    stats = [_compute_statistical_result(it["student"], it["reference"]) for it in items]

    escalate_indices = [
        i for i, s in enumerate(stats)
        if use_llm_judge and not s.get("empty") and s["should_escalate"]
    ]

    verdicts = {}
    if escalate_indices and llm_judge.is_available():
        pairs = [(stats[i]["normalized_student"], stats[i]["normalized_reference"]) for i in escalate_indices]
        batch_results = llm_judge.judge_batch(pairs)
        for idx, verdict in zip(escalate_indices, batch_results):
            verdicts[idx] = verdict
    elif escalate_indices:
        for i in escalate_indices:
            verdicts[i] = {"judge_available": False, "error": "llm_judge_unavailable"}

    return [
        _finalize_result(stats[i], verdicts.get(i), max_marks, pass_threshold)
        for i in range(len(items))
    ]


def evaluate_mcq(student_choice: str, correct_choice: str, max_marks: float = 2.0) -> dict:
    """Exact-match grading for multiple-choice questions. Unchanged from
    the original implementation - kept identical for route compatibility."""
    is_correct = student_choice.strip().lower() == correct_choice.strip().lower()
    return {
        "semantic_score": None,
        "concept_score": None,
        "final_score": 1.0 if is_correct else 0.0,
        "marks_awarded": max_marks if is_correct else 0.0,
        "is_correct": is_correct,
        "matched_concepts": None,
        "missed_concepts": None,
        "keyword_stuffing_detected": False,
        "logic_inversion_detected": False,
        "stuffing_signals": [],
    }