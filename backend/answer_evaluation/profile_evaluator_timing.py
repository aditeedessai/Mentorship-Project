"""
backend.answer_evaluation.profile_evaluator_timing

Throwaway manual profiling script - NOT a pytest test (deliberately not
named test_*.py so pytest won't collect it), doesn't need to be
committed. Run it directly:

    python -m backend.answer_evaluation.profile_evaluator_timing

Calls evaluate_answer() a few times with different realistic inputs so
the per-stage TIMING log line evaluator.py now emits (see
_timed_stage / the logger.info call in evaluate_answer()) is visible in
the console for each case. Assumes models are already loaded once (the
first call below pays that cost like any cold process would - only the
SECOND call onward reflects "models already in memory" timing, so look
at run 2+ for the real per-answer cost).

Also clears the on-disk LLM-judge cache (.llm_judge_cache.json) before
running, so the escalation case below always makes a REAL network call
instead of silently returning a cached verdict from a previous run of
this same script - that would hide exactly the timing this script
exists to show. This means the escalation case genuinely costs an API
call (and the free-tier throttle) every time you run this file.
"""

import logging

logging.basicConfig(level=logging.INFO, format="%(message)s")

from backend.answer_evaluation.evaluator import evaluate_answer
from backend.answer_evaluation import llm_judge

REFERENCE = (
    "Cloud platforms like Google App Engine and Azure App Services let "
    "developers deploy applications without managing the underlying "
    "servers, handling scaling, load balancing, and infrastructure "
    "automatically."
)

CASES = [
    (
        "short correct answer",
        "Google App Engine and Azure App Services",
    ),
    (
        "longer paraphrased correct answer",
        "Platforms such as App Engine from Google or Azure's App Service "
        "take care of the actual servers for you, so as a developer you "
        "just deploy your code and the platform automatically handles "
        "things like scaling up under load and balancing traffic across "
        "instances, without you managing any infrastructure yourself.",
    ),
    (
        "answer likely to trigger LLM judge escalation",
        "Cloud platforms like Google App Engine do NOT handle scaling or "
        "load balancing - developers have to manually provision and "
        "manage their own servers because the platform prevents "
        "automatic infrastructure management.",
    ),
]

if __name__ == "__main__":
    llm_judge.clear_cache()
    for label, student_answer in CASES:
        print(f"\n=== {label} ===")
        print(f"student_answer: {student_answer!r}")
        result = evaluate_answer(student_answer, REFERENCE, max_marks=10.0)
        print(
            f"final_score={result['final_score']} "
            f"marks_awarded={result['marks_awarded']} "
            f"is_correct={result['is_correct']} "
            f"llm_judge_triggered={result['llm_judge_triggered']}"
        )
        # ^ the TIMING line above this (from evaluator.py's logger.info)
        # is the actual per-stage breakdown for this call.
