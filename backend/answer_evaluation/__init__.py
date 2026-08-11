"""
backend.answer_evaluation

Hybrid answer grading package: cross-encoder semantic scoring (floor)
+ concept coverage (bonus) + keyword-stuffing detection (penalty)
+ domain-agnostic logic divergence protection.

Import from service layer as:

    from backend.answer_evaluation import (
        evaluate_answer,
        evaluate_mcq,
        aggregate_topic_scores,
    )
"""

from backend.answer_evaluation.evaluator import evaluate_answer, evaluate_mcq
from backend.answer_evaluation.topic_scorer import aggregate_topic_scores

__all__ = ["evaluate_answer", "evaluate_mcq", "aggregate_topic_scores"]