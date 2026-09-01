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
import time
import logging
from contextlib import contextmanager

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
from backend.answer_evaluation.normalization import normalize_text, extract_dynamic_protected_terms, real_word_ratio
from backend.answer_evaluation import llm_judge

logger = logging.getLogger(__name__)

# --- Per-stage timing instrumentation -----------------------------------
# Lightweight profiling for "how long does one evaluate_answer() call take
# once models are already loaded" - just time.perf_counter() plus a dict,
# not a profiling library. _compute_statistical_result() records each
# stage's elapsed time (milliseconds) into a `stage_timings` dict under
# the returned stat dict's "stage_timings" key; evaluate_answer() adds the
# LLM-judge call's own timing on top of that and logs everything as ONE
# combined line per call (see the logger.info call near the end of
# evaluate_answer()) rather than one log line per stage.
@contextmanager
def _timed_stage(timings: dict, key: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        timings[key] = round((time.perf_counter() - start) * 1000, 3)


# --- Gibberish / non-answer gate ---------------------------------------
# Catches text that isn't real, on-topic language at all (e.g.
# "bgnghnghng") before it ever reaches semantic/concept scoring or the
# LLM judge. Without this, gibberish trivially answers "no" to all three
# of the LLM judge's questions (contradicts the reference? hallucinates a
# claim? invalid logic?) - since it isn't a claim of any kind - so the
# judge returns a clean verdict, which _finalize_result's confirmation
# logic (correctly, in every OTHER case) then treats as a positive
# signal and floors final_score at LLM_CONFIRM_SCORE_FLOOR. That's the
# exact mechanism that let "bgnghnghng" score 7.5/10 against a real
# reference answer about cloud platforms.
#
# 0.50 (the conservative end of a defensible 0.40-0.50 range) means an
# answer is only gated when a MAJORITY of its qualifying words are
# unrecognized - a real short/technical answer only needs roughly half
# its words to be dictionary-recognized or protected terms to pass; see
# real_word_ratio()'s own docstring for what counts as "qualifying".
GIBBERISH_REAL_WORD_RATIO_THRESHOLD = 0.50

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

# --- Self-consistency polling thresholds ---------------------------------
# Confirmed via repeated live testing (2026-08-31, the "btirhs delasiph
# ustm..." keyword-salad case): a SINGLE judge call can occasionally
# return a clean verdict for text that isn't a coherent claim at all -
# genuine hosted-LLM non-determinism (see
# llm_judge.judge_answer_polled()'s docstring), not a deterministic code
# bug. evaluate_answer() now asks the same question POLL_COUNT times
# (batched into one request) instead of trusting one sample, and these
# two thresholds turn the vote counts into a score adjustment -
# deliberately ASYMMETRIC, not a simple majority vote:
#   - Rescue (float to LLM_CONFIRM_SCORE_FLOOR) requires EVERY vote
#     clean, i.e. flagged_count == 0. A single dissenting vote withholds
#     it - a false rescue (wrongly boosting a bad answer) is worse than
#     a missed one.
#   - Penalty (cap at LLM_OVERRIDE_SCORE_CAP) requires at least
#     POLL_PENALTY_MIN_FLAGGED_VOTES, not just one - a single flaky
#     negative vote must never be enough to harshly cap a score on its
#     own, or this becomes an inverse version of the known Row 5 bug
#     (over-punishing based on one noisy call instead of over-rewarding
#     based on one - see the completeness-rescue investigation).
#   - Anything else (with POLL_COUNT=3, exactly 1 of 3 flagged) is
#     genuine ambiguity: final_score falls back to exactly what the
#     pre-judge statistical pipeline already computed - no boost, no cap.
POLL_PENALTY_MIN_FLAGGED_VOTES = 2

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

# --- Completeness rescue trigger: correct-but-differently-worded answers ---
# Confirmed against real evaluations data (2026-08-31 diagnostic query):
# an answer can have near-perfect concept_score but a semantic_score the
# cross-encoder doesn't fully reward (different phrasing/structure, a
# terse or list-style restatement, or a reference that explicitly allows
# a subset - e.g. "name any two of the following") - landing final_score
# confidently ABOVE the ordinary borderline-escalation band
# ([BORDERLINE_LOW, BORDERLINE_HIGH]), high enough that none of the
# existing triggers above ever fire, yet still well short of full marks.
# Deliberately NOT gated behind `nli_locally_resolved` the way the
# borderline/divergence/near-perfect checks above are: LOCAL_CONFIRM_SCORE_FLOOR
# (0.70) is EXACTLY the mechanism that silently caps a genuinely correct,
# differently-worded answer there with no path to ever recognize it
# deserves more - this trigger has to stay reachable even when local NLI
# already confidently resolved entailment, or it would never fire for the
# one case it exists to fix.
#
# This is a DIFFERENT question from the existing judge's three
# (contradiction/hallucination/logic): "does this fully and correctly
# cover the reference, regardless of wording?" - so it gets its own
# narrow trigger, its own judge function (llm_judge.judge_completeness),
# and its own floor constant, never reusing LLM_CONFIRM_SCORE_FLOOR -
# "not wrong" and "fully correct and complete" are different confidence
# claims. It is also a rescue-only mechanism: a "not fully correct"
# verdict (or an unavailable judge) is a no-op, never a penalty - see
# _finalize_result.
#
# Kept as narrow as the real data justifies, since every escalation here
# is an extra LLM-judge call: concept_score has to be genuinely high
# (0.80+, not just "decent"), and the score band (0.65-0.88) sits well
# above the ordinary borderline range and stops short of near-perfect
# (where the answer is already close enough to full marks that a rescue
# call adds little).
COMPLETENESS_ESCALATE_REASON = "completeness_check_high_concept"
COMPLETENESS_GATE_CONCEPT_THRESHOLD = 0.80
COMPLETENESS_GATE_SCORE_LOW = 0.65
COMPLETENESS_GATE_SCORE_HIGH = 0.88
COMPLETENESS_CONFIRM_SCORE_FLOOR = 0.92

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

    # Completeness rescue - see COMPLETENESS_* constants above for the
    # full reasoning. Checked LAST, unconditionally (not gated behind
    # nli_locally_resolved like the borderline/divergence/near-perfect
    # checks near the top): every other, more specific signal above gets
    # priority, so this only ever fires for an answer nothing else
    # already flagged as ambiguous or wrong.
    if (
        concept_score >= COMPLETENESS_GATE_CONCEPT_THRESHOLD
        and COMPLETENESS_GATE_SCORE_LOW <= final_score <= COMPLETENESS_GATE_SCORE_HIGH
    ):
        return True, COMPLETENESS_ESCALATE_REASON

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
    stage_timings = {}

    protected_terms = extract_dynamic_protected_terms(reference_answer)
    with _timed_stage(stage_timings, "normalization_ms"):
        normalized_student = normalize_text(student_answer, protected_terms)
        normalized_reference = normalize_text(reference_answer, protected_terms)

    # --- Gibberish / non-answer gate ------------------------------------
    # See the GIBBERISH_REAL_WORD_RATIO_THRESHOLD comment above this
    # function's imports for the full bug this fixes. Checked here, on
    # the already-normalized text, before ANY of the semantic/concept/
    # LLM-judge machinery runs - a genuinely misspelled-but-real word that
    # correct_typos() already fixed doesn't get penalized twice, and
    # nothing downstream (including an LLM judge call) ever sees text
    # this confident isn't a real attempt at the question.
    if real_word_ratio(normalized_student, protected_terms) < GIBBERISH_REAL_WORD_RATIO_THRESHOLD:
        return {
            "empty": False,
            "is_gibberish": True,
            "should_escalate": False,
            "escalate_reason": None,
        }

    with _timed_stage(stage_timings, "semantic_ms"):
        semantic_score = semantic_correctness_score(normalized_student, normalized_reference)

    with _timed_stage(stage_timings, "concept_ms"):
        concept_result = concept_coverage_score(normalized_student, normalized_reference)
        concept_score = concept_result["coverage_score"]

    with _timed_stage(stage_timings, "stuffing_ms"):
        stuffing_result = detect_keyword_stuffing(
            student_answer, reference_answer, concept_result["matched"]
        )
        is_stuffing = stuffing_result["is_stuffing"]

    # Prefer the spaCy dependency-parse check over the word-list heuristic
    # when available - it replaces rather than merely corroborates
    # detect_generic_negation_shift.
    with _timed_stage(stage_timings, "negation_ms"):
        spacy_negation_result = detect_negation_shift_spacy(normalized_student, normalized_reference)
        has_negation_shift = (
            spacy_negation_result if spacy_negation_result is not None
            else detect_generic_negation_shift(normalized_student, normalized_reference)
        )

    has_causal_language = has_causal_connector(student_answer)

    with _timed_stage(stage_timings, "nli_ms"):
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
    stage_timings.setdefault("clause_nli_ms", 0.0)
    clause_nli_result = None
    if has_causal_language:
        premise_clause, conclusion_clause = split_causal_clauses(normalized_student)
        if premise_clause and conclusion_clause:
            with _timed_stage(stage_timings, "clause_nli_ms"):
                try:
                    clause_nli_result = clause_entailment_check(premise_clause, conclusion_clause)
                except Exception as e:  # pragma: no cover
                    logger.warning("evaluator.py: clause-level NLI check failed (%s); skipping it.", e)
                    clause_nli_result = None

    # Only pay for the HHEM call when concept overlap OR semantic
    # similarity is already high enough that a hallucinated "right words,
    # invented claim" answer could otherwise slip through undetected.
    stage_timings.setdefault("hallucination_ms", 0.0)
    hallucination_result = None
    if concept_score >= HALLUCINATION_CONCEPT_GATE_THRESHOLD or semantic_score >= HALLUCINATION_SEMANTIC_GATE_THRESHOLD:
        with _timed_stage(stage_timings, "hallucination_ms"):
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
        "stage_timings": stage_timings,
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
            "judge_unavailable_unverified": False,
        }

    if stat.get("is_gibberish"):
        # Scored at a flat 0 (comfortably inside the "at or near 0" bar) -
        # this is a deliberate, honest zero, not a fabricated statistical
        # result: the gate below fired specifically because the pipeline
        # is confident this isn't real language, so the semantic/concept
        # scores were never computed at all rather than computed and then
        # overridden. is_correct is unconditionally False - no LLM verdict
        # can raise it, because the judge was never called.
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
            "judge_unavailable_unverified": False,
        }

    final_score = stat["final_score"]
    llm_forced_incorrect = False

    if stat.get("escalate_reason") == COMPLETENESS_ESCALATE_REASON:
        # Completeness rescue (see COMPLETENESS_* constants) - deliberately
        # ASYMMETRIC with the branch below: only ever raises final_score,
        # never caps it or forces is_correct False. An incomplete-but-not-
        # wrong answer isn't a negative signal the way a contradiction or
        # hallucination is - it's just an under-scored correct one - so a
        # "not fully correct" verdict, or an unavailable judge, is simply
        # a no-op here, leaving the statistical pipeline's own score
        # exactly as computed. This is a rescue mechanism, not a new way
        # to penalize answers.
        completeness_confirmed = bool(
            llm_judge_verdict
            and llm_judge_verdict.get("judge_available")
            and llm_judge_verdict.get("fully_correct")
        )
        if completeness_confirmed:
            final_score = max(final_score, COMPLETENESS_CONFIRM_SCORE_FLOOR)
    else:
        # llm_judge_verdict is judge_answer_polled()'s aggregate vote-count
        # shape ({"judge_available", "votes", "poll_count", "clean_count",
        # "flagged_count"}) - see POLL_PENALTY_MIN_FLAGGED_VOTES above for
        # the exact asymmetric thresholds this applies. A judge that's
        # unavailable, or a split vote that clears neither threshold, is
        # genuine ambiguity - final_score is simply left exactly as the
        # statistical pipeline computed it, no boost, no cap.
        llm_judge_available = bool(llm_judge_verdict and llm_judge_verdict.get("judge_available"))
        flagged_count = llm_judge_verdict.get("flagged_count", 0) if llm_judge_verdict else 0
        clean_count = llm_judge_verdict.get("clean_count", 0) if llm_judge_verdict else 0

        if llm_judge_available and flagged_count >= POLL_PENALTY_MIN_FLAGGED_VOTES:
            llm_forced_incorrect = True
            final_score = min(final_score, LLM_OVERRIDE_SCORE_CAP)
        elif llm_judge_available and flagged_count == 0 and clean_count > 0 and not stat["is_stuffing"]:
            # Every poll vote was clean - a positive confirmation, not a
            # no-op - use it as a floor the same way a confirmed-bad
            # verdict is used as a ceiling. A single dissenting vote
            # (flagged_count >= 1 but below the penalty threshold) withholds
            # this rescue entirely - see the module-level POLL_* comment for
            # why that asymmetry is deliberate. Skipped for is_stuffing
            # items because the judge's questions say nothing about whether
            # the text is a genuine sentence vs. a keyword dump.
            final_score = max(final_score, LLM_CONFIRM_SCORE_FLOOR)

    final_score = max(0.0, min(1.0, final_score))
    marks_awarded = round(final_score * max_marks, 2)

    is_correct = (final_score >= pass_threshold) and (not stat["is_stuffing"]) and (not llm_forced_incorrect)

    # Backward-compat: fold the LLM judge's verdict into the same
    # logic_inversion_detected flag the local signals already produced,
    # so callers reading only that one field still see the full picture.
    # llm_forced_incorrect is already exactly "the judge (poll-confirmed,
    # for the standard path) found a real problem" - safe to reuse
    # directly here instead of re-reading llm_judge_verdict's fields,
    # since the completeness verdict shape never sets it True either.
    logic_inversion_detected = bool(stat.get("logic_inversion_detected")) or bool(llm_forced_incorrect)

    # Issue 1 / Problem B fix: an escalated item whose judge call never
    # actually produced a verdict (quota exhaustion, network failure,
    # parse failure, or the judge being unavailable altogether - anything
    # where judge_available is falsy) leaves final_score exactly as the
    # statistical pipeline computed it, above (deliberately - this is
    # still the right behavior, matching the "never falsely rescue"
    # principle everywhere else in this file). But that untouched score
    # is NOT the same thing as a judge-confirmed one: the pipeline
    # *decided* this case was ambiguous enough to need a second opinion,
    # and never got one. This flag makes that distinction visible to
    # callers instead of letting an unverified statistical score look
    # identical to a genuinely judge-cleared or never-escalated one.
    # True only when escalation was actually attempted AND no real
    # verdict came back - never true for an item that didn't escalate at
    # all (should_escalate=False), and never true once a real verdict
    # comes back (judge_available=True), even an ambiguous split vote -
    # a split vote is still a verdict, just an inconclusive one.
    judge_unavailable_unverified = bool(stat["should_escalate"]) and not bool(
        llm_judge_verdict and llm_judge_verdict.get("judge_available")
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
        "judge_unavailable_unverified": judge_unavailable_unverified,
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
    eval_start = time.perf_counter()
    stat = _compute_statistical_result(student_answer, reference_answer)
    if stat.get("empty"):
        return _finalize_result(stat, None, max_marks, pass_threshold)

    llm_judge_verdict = None
    llm_judge_ms = 0.0
    if use_llm_judge and stat["should_escalate"]:
        if llm_judge.is_available():
            judge_start = time.perf_counter()
            # Completeness escalations ask a different question (does this
            # fully cover the reference, regardless of wording?) than the
            # standard judge's questions (contradiction/hallucination/
            # logic/coherence) - see judge_completeness()'s docstring - so
            # they get routed to their own judge function. Every other
            # escalation uses judge_answer_polled() (self-consistency
            # polling), not the single-shot judge_answer() - see POLL_*
            # constants above for why a single sample is no longer trusted.
            if stat.get("escalate_reason") == COMPLETENESS_ESCALATE_REASON:
                llm_judge_verdict = llm_judge.judge_completeness(
                    stat["normalized_student"], stat["normalized_reference"]
                )
            else:
                llm_judge_verdict = llm_judge.judge_answer_polled(
                    stat["normalized_student"], stat["normalized_reference"]
                )
            llm_judge_ms = round((time.perf_counter() - judge_start) * 1000, 3)
        else:
            llm_judge_verdict = {"judge_available": False, "error": "llm_judge_unavailable"}

    # Single combined timing line per evaluate_answer() call (easy to scan
    # in server logs) rather than one log line per stage. stage_timings is
    # only non-empty on the normal (non-empty-input, non-gibberish) path -
    # see _compute_statistical_result()'s early-return branches - so this
    # is silent for those near-instant short-circuits, which aren't the
    # "real bottleneck" this instrumentation exists to find.
    stage_timings = stat.get("stage_timings")
    if stage_timings:
        total_ms = round((time.perf_counter() - eval_start) * 1000, 3)
        logger.info(
            "evaluator.py: TIMING total=%.1fms normalization=%.1fms semantic=%.1fms "
            "concept=%.1fms stuffing=%.1fms negation=%.1fms nli=%.1fms clause_nli=%.1fms "
            "hallucination=%.1fms llm_judge=%.1fms (escalated=%s reason=%s)",
            total_ms,
            stage_timings.get("normalization_ms", 0.0),
            stage_timings.get("semantic_ms", 0.0),
            stage_timings.get("concept_ms", 0.0),
            stage_timings.get("stuffing_ms", 0.0),
            stage_timings.get("negation_ms", 0.0),
            stage_timings.get("nli_ms", 0.0),
            stage_timings.get("clause_nli_ms", 0.0),
            stage_timings.get("hallucination_ms", 0.0),
            llm_judge_ms,
            stat.get("should_escalate"),
            stat.get("escalate_reason"),
        )

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
    calls, escalated items go out in a handful of grouped requests.

    Escalated items are routed by escalate_reason, the same way
    evaluate_answer() already routes a single item:
      - COMPLETENESS_ESCALATE_REASON items ask a different question
        (is this different-but-non-wrong answer actually complete?) and
        go to llm_judge.judge_completeness(), looped per item since no
        batched/polled completeness judge exists.
      - everything else goes to llm_judge.judge_batch_polled() (see
        JUDGE_POLL_BATCH_SIZE / POLL_BATCH_CHUNK_SIZE), which asks the
        same self-consistency-polled, coherence-checked question
        evaluate_answer() asks via judge_answer_polled() for a single
        item - grouped across pairs into a handful of requests instead
        of one call per pair.

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

    # Split by escalate_reason BEFORE dispatching - completeness
    # escalations ask a different question than the standard contra-
    # diction/hallucination/logic/coherence one, the same distinction
    # evaluate_answer() already makes for a single item. Previously this
    # function ignored escalate_reason entirely and sent every escalated
    # item (completeness-shaped ones included) through the standard
    # judge, which meant completeness-shaped items in the batch/section-
    # submission path were being asked the wrong question. Fixed here,
    # kept separate from the polling swap below.
    completeness_indices = [
        i for i in escalate_indices if stats[i].get("escalate_reason") == COMPLETENESS_ESCALATE_REASON
    ]
    completeness_set = set(completeness_indices)
    standard_indices = [i for i in escalate_indices if i not in completeness_set]

    verdicts = {}

    if completeness_indices:
        if llm_judge.is_available():
            # No batched/polled completeness judge exists - looped, not
            # batched together, matching evaluate_answer()'s own use of
            # judge_completeness() (single-shot, no polling). Completeness
            # escalations are expected to be rare relative to standard
            # ones, so this doesn't need its own batching mechanism today.
            for i in completeness_indices:
                verdicts[i] = llm_judge.judge_completeness(
                    stats[i]["normalized_student"], stats[i]["normalized_reference"]
                )
        else:
            for i in completeness_indices:
                verdicts[i] = {"judge_available": False, "error": "llm_judge_unavailable"}

    # --- Self-consistency polling for the standard escalation path -------
    # judge_batch() (unpolled, no coherence question) is no longer used
    # here - it's replaced with judge_batch_polled(), the batch-path
    # equivalent of judge_answer_polled(), so real quiz submissions get
    # the same non-determinism protection evaluate_answer() already has.
    # judge_batch() itself is untouched and still used elsewhere as-is.
    if standard_indices:
        if llm_judge.is_available():
            pairs = [(stats[i]["normalized_student"], stats[i]["normalized_reference"]) for i in standard_indices]
            batch_results = llm_judge.judge_batch_polled(pairs)
            for idx, verdict in zip(standard_indices, batch_results):
                verdicts[idx] = verdict
        else:
            for i in standard_indices:
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