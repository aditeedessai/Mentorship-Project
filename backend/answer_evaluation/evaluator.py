"""
backend.answer_evaluation.evaluator

Hybrid Answer Evaluation Engine with Domain-Agnostic Divergence & Logic Protection.
Grades student answers across ANY academic subject accurately.
"""

from backend.answer_evaluation.sbert_model import semantic_correctness_score
from backend.answer_evaluation.similarity import (
    concept_coverage_score,
    detect_keyword_stuffing,
    detect_generic_negation_shift,
)

CONCEPT_BONUS_WEIGHT = 0.15

# Concept Gate Thresholds
CONCEPT_GATE_COVERAGE_THRESHOLD = 0.30
CONCEPT_GATE_SEMANTIC_THRESHOLD = 0.68
CONCEPT_GATE_PENALTY_MULTIPLIER = 0.75

# Domain-Agnostic Divergence Gate (Catches High Overlap + Swapped Logic)
DIVERGENCE_CONCEPT_THRESHOLD = 0.35    # High keyword match
DIVERGENCE_SEMANTIC_THRESHOLD = 0.68   # But CrossEncoder detects meaning gap
DIVERGENCE_PENALTY_MULTIPLIER = 0.50   # Cuts score in half for wrong logic

STUFFING_PENALTY_MULTIPLIER = 0.50


def evaluate_answer(student_answer: str, reference_answer: str, max_marks: float = 10.0) -> dict:
    """
    Grades a student's written answer across ANY domain (Networking, OS, Physics,
    Hydrology, etc.) with statistical protection against keyword-overlap and wrong logic.
    """
    if not student_answer or not student_answer.strip():
        return {
            "semantic_score": 0.0,
            "concept_score": 0.0,
            "final_score": 0.0,
            "marks_awarded": 0.0,
            "matched_concepts": [],
            "missed_concepts": [],
            "keyword_stuffing_detected": False,
            "logic_inversion_detected": False,
            "stuffing_signals": [],
        }

    # 1. Primary Semantic Floor (CrossEncoder)
    semantic_score = semantic_correctness_score(student_answer, reference_answer)

    # 2. Concept Coverage (BiEncoder + Lexical)
    concept_result = concept_coverage_score(student_answer, reference_answer)
    concept_score = concept_result["coverage_score"]

    # 3. Cheat / Stuffing Detection
    stuffing_result = detect_keyword_stuffing(
        student_answer, reference_answer, concept_result["matched"]
    )
    is_stuffing = stuffing_result["is_stuffing"]

    # 4. Universal Polarity / Negation Shift Check
    has_negation_shift = detect_generic_negation_shift(student_answer, reference_answer)

    # --- SCORE INTEGRATION WITH DOMAIN-AGNOSTIC DIVERGENCE PROTECTION ---

    # CASE A: Keyword Stuffing / Unstructured Word Dump
    if is_stuffing:
        final_score = semantic_score * STUFFING_PENALTY_MULTIPLIER
        logic_inversion = False

    # CASE B: Statistical Divergence (High Concept Match + Low Semantic Match)
    # OR Introduced Negation Shift -> Wrong Logic / Inverted Statement
    elif (concept_score >= DIVERGENCE_CONCEPT_THRESHOLD and semantic_score < DIVERGENCE_SEMANTIC_THRESHOLD) or (has_negation_shift and semantic_score < DIVERGENCE_SEMANTIC_THRESHOLD):
        final_score = semantic_score * DIVERGENCE_PENALTY_MULTIPLIER
        logic_inversion = True

    # CASE C: Low Concept Coverage + Unconfident Semantic Score (Hollow Answer)
    elif concept_score < CONCEPT_GATE_COVERAGE_THRESHOLD and semantic_score < CONCEPT_GATE_SEMANTIC_THRESHOLD:
        final_score = semantic_score * CONCEPT_GATE_PENALTY_MULTIPLIER
        logic_inversion = False

    # CASE D: Genuine Answer (Valid Semantic Meaning)
    else:
        bonus = CONCEPT_BONUS_WEIGHT * concept_score * (1.0 - semantic_score)
        final_score = semantic_score + bonus
        logic_inversion = False

    final_score = max(0.0, min(1.0, final_score))
    marks_awarded = round(final_score * max_marks, 2)

    return {
        "semantic_score": round(semantic_score, 3),
        "concept_score": round(concept_score, 3),
        "final_score": round(final_score, 3),
        "marks_awarded": marks_awarded,
        "matched_concepts": concept_result["matched"],
        "missed_concepts": concept_result["missed"],
        "keyword_stuffing_detected": is_stuffing,
        "logic_inversion_detected": logic_inversion,
        "stuffing_signals": stuffing_result["signals_triggered"],
    }


def evaluate_mcq(student_choice: str, correct_choice: str, max_marks: float = 2.0) -> dict:
    """Exact-match grading for multiple-choice questions."""
    is_correct = student_choice.strip().lower() == correct_choice.strip().lower()
    return {
        "semantic_score": None,
        "concept_score": None,
        "final_score": 1.0 if is_correct else 0.0,
        "marks_awarded": max_marks if is_correct else 0.0,
        "matched_concepts": None,
        "missed_concepts": None,
        "keyword_stuffing_detected": False,
        "logic_inversion_detected": False,
        "stuffing_signals": [],
    }