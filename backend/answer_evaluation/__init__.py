"""
backend.answer_evaluation

Hybrid answer grading package: cross-encoder semantic scoring (floor)
+ concept coverage (bonus) + human-writing-style normalization
(typo/contraction cleanup) + keyword-stuffing detection (penalty)
+ local NLI contradiction pre-filter + domain-agnostic negation/logic
divergence protection + an LLM-as-judge fallback (Gemini/Ollama) for the
genuinely ambiguous cases (hallucination, inverted causal logic).

Import from service layer as:

    from backend.answer_evaluation import (
        evaluate_answer,
        evaluate_answers_batch,
        evaluate_mcq,
        aggregate_topic_scores,
    )

`evaluate_answer` and `evaluate_mcq` keep the exact same names and
call signatures your routes already use - nothing else needs to change
for existing endpoints to keep working. `evaluate_answers_batch` is new
and purely additive (use it if/when you want to grade many answers in
one call with batched LLM-judge escalation).
"""

from backend.answer_evaluation.evaluator import (
    evaluate_answer,
    evaluate_answers_batch,
    evaluate_mcq,
)
from backend.answer_evaluation.topic_scorer import aggregate_topic_scores

__all__ = [
    "evaluate_answer",
    "evaluate_answers_batch",
    "evaluate_mcq",
    "aggregate_topic_scores",
]