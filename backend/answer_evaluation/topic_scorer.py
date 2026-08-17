"""
backend.answer_evaluation.topic_scorer

Aggregates per-question hybrid evaluation results into a topic-level
score, and gives each topic a plain-English REMARK (Excellent / Very
Good / Good / Average / Needs Improvement / Weak) instead of a single
hand-picked weak/strong cutoff - and instead of a letter grade.

------------------------------------------------------------------------
WHAT CHANGED FROM THE ORIGINAL VERSION
------------------------------------------------------------------------
The original implementation split every topic into just two buckets,
"weak" or "strong", using one flat threshold hardcoded in this file
(WEAK_TOPIC_THRESHOLD = 70.0). That has two real problems:
  1. It throws away information - a 35% topic and a 69% topic both land
     in "weak" even though they need very different interventions, and
     a 71% and a 99% both land in "strong" even though one is barely
     passing and the other is close to perfect.
  2. 70.0 wasn't derived from anything - it was just picked.

This version delegates grading to grading.py, which uses the CBSE
Classes IX & X percentage cut-points (91/81/71/51/33) but reports them
as plain remarks rather than letter grades. Every topic now gets:
  - a `remark` (Excellent / Very Good / Good / Average / Needs
    Improvement / Weak),
  - a coarse 3-way `remark_status` (strong/average/weak) rolled up from
    the remark, which is a genuinely data-grounded split instead of an
    arbitrary cut-line.

No letter grade (A1, B2, etc.) or grade point is produced anywhere in
this module.

IMPORTANT - THRESHOLD VALUE CHANGE: `WEAK_TOPIC_THRESHOLD` is no longer
defined locally as 70.0. It is now imported from grading.py and equals
51.0 (the real Average/Needs-Improvement boundary). Any caller that
imports `WEAK_TOPIC_THRESHOLD` from this module (directly, or via
`performance_scorer.py`) and does NOT pass its own `threshold=`
argument will see the legacy `status`/`weak_topics`/`strong_topics`
split move from a 70% cut-line to a 51% cut-line. See
INTEGRATION_NOTES.md for how to opt back into 70.0 if a caller
depends on the old cut-line specifically.

BACKWARD COMPATIBILITY: aggregate_topic_scores() keeps its exact
signature and its existing output keys (topics[topic] still has
marks_awarded/max_marks/percentage/status; weak_topics/strong_topics/
overall_percentage are all still top-level keys with the same meaning).
The `threshold` parameter still works exactly as before for any caller
that wants a specific custom weak/strong cut instead of the built-in
bands - passing it does NOT touch the new `remark` field, which is
always graded against the real bands regardless of `threshold`. Every
new field (remark, overall_remark, needs_improvement_topics,
remark_strong_topics/remark_average_topics/remark_weak_topics) is
purely additive.

------------------------------------------------------------------------
INTEGRATION
------------------------------------------------------------------------
Import from elsewhere in the package as:

    from backend.answer_evaluation.topic_scorer import (
        aggregate_topic_scores,
        WEAK_TOPIC_THRESHOLD,
    )

`aggregate_topic_scores()` takes whatever flat list of per-question
result dicts the caller already has (see its docstring below for the
exact shape) - it has no built-in example data and does not run
anything on import. See INTEGRATION_NOTES.md for the exact input/output
contract.
"""

from collections import defaultdict

from backend.answer_evaluation.grading import grade_for_percentage, WEAK_TOPIC_THRESHOLD

__all__ = ["aggregate_topic_scores", "WEAK_TOPIC_THRESHOLD"]


def aggregate_topic_scores(question_results: list, threshold: float = WEAK_TOPIC_THRESHOLD) -> dict:
    """
    Rolls up a flat list of per-question results into a topic-level
    breakdown, marks-weighted across all topics.

    `question_results`: list of dicts, each shaped
        {"topic": <str>, "marks_awarded": <float>, "max_marks": <float>}
    Every entry needs a `topic` key - build_scored_entries() in
    performance_scorer.py already supplies "general" for entries with
    no topic set, so callers going through that helper never need to
    worry about this. Callers building entries by hand must include
    `topic` on every dict themselves.

    `threshold`: kept for backward compatibility. Controls ONLY the
    legacy `topics[topic]["status"]` field (still "weak"/"strong",
    still a simple percentage >= threshold check) and the legacy
    `weak_topics`/`strong_topics` lists, exactly as the original
    implementation did. It has no effect on the new remark-based
    fields below, which always use the real bands - if you want a
    custom cutoff to also drive the new fields, filter
    `topics[topic]["remark_status"]` yourself using whatever rule you
    need instead of relying on this parameter.

    Returns:
        {
          "topics": {
              <topic>: {
                  "marks_awarded": float,
                  "max_marks": float,
                  "percentage": float,
                  "status": "weak" | "strong",            # legacy, threshold-driven
                  "remark": "Excellent" | ... | "Weak",     # new
                  "remark_status": "strong" | "average" | "weak",  # new
              },
              ...
          },
          "weak_topics": [<topic>, ...],       # legacy, threshold-driven
          "strong_topics": [<topic>, ...],     # legacy, threshold-driven
          "overall_percentage": float,
          "overall_remark": "Excellent" | ... | "Weak",             # new
          "remark_strong_topics": [<topic>, ...],                   # new
          "remark_average_topics": [<topic>, ...],                  # new
          "remark_weak_topics": [<topic>, ...],                     # new
          "needs_improvement_topics": [<topic>, ...],               # new
        }

    Empty `question_results` returns an empty "topics" dict, empty
    lists everywhere, and overall_percentage=0.0 (no division by zero).
    """
    topic_totals = defaultdict(lambda: {"marks_awarded": 0.0, "max_marks": 0.0})

    for entry in question_results:
        topic = entry["topic"]
        topic_totals[topic]["marks_awarded"] += entry["marks_awarded"]
        topic_totals[topic]["max_marks"] += entry["max_marks"]

    topics = {}
    weak_topics = []
    strong_topics = []

    # New: full 3-way split (strong/average/weak), derived from the
    # remark bands rather than a single cutoff. `weak_topics` /
    # `strong_topics` above stay as the legacy 2-way split (driven by
    # `threshold`) so nothing that reads those two keys breaks; use
    # these three lists instead if you want the more informative split.
    remark_strong_topics = []
    remark_average_topics = []
    remark_weak_topics = []
    needs_improvement_topics = []  # remark == "Needs Improvement" specifically -
                                    # the band right at the qualifying line;
                                    # useful as its own list since it's
                                    # "weak" but closest to recoverable.

    overall_awarded = 0.0
    overall_max = 0.0

    for topic, totals in topic_totals.items():
        marks_awarded = totals["marks_awarded"]
        max_marks = totals["max_marks"]

        percentage = round((marks_awarded / max_marks) * 100, 2) if max_marks > 0 else 0.0
        legacy_status = "weak" if percentage < threshold else "strong"

        remark = grade_for_percentage(percentage)

        topics[topic] = {
            "marks_awarded": round(marks_awarded, 2),
            "max_marks": round(max_marks, 2),
            "percentage": percentage,
            # legacy field - unchanged meaning, still driven by `threshold`
            "status": legacy_status,
            # new field - always graded, independent of `threshold`
            "remark": remark.remark,
            "remark_status": remark.status,  # "strong" | "average" | "weak"
        }

        if legacy_status == "weak":
            weak_topics.append(topic)
        else:
            strong_topics.append(topic)

        if remark.status == "strong":
            remark_strong_topics.append(topic)
        elif remark.status == "average":
            remark_average_topics.append(topic)
        else:
            remark_weak_topics.append(topic)

        if remark.remark == "Needs Improvement":
            needs_improvement_topics.append(topic)

        overall_awarded += marks_awarded
        overall_max += max_marks

    overall_percentage = round((overall_awarded / overall_max) * 100, 2) if overall_max > 0 else 0.0
    overall_remark = grade_for_percentage(overall_percentage)

    return {
        "topics": topics,
        # legacy keys, unchanged behavior
        "weak_topics": weak_topics,
        "strong_topics": strong_topics,
        "overall_percentage": overall_percentage,
        # new keys, purely additive
        "overall_remark": overall_remark.remark,
        "remark_strong_topics": remark_strong_topics,
        "remark_average_topics": remark_average_topics,
        "remark_weak_topics": remark_weak_topics,
        "needs_improvement_topics": needs_improvement_topics,
    }