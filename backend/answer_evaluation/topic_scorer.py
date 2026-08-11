"""
backend.answer_evaluation.topic_scorer

Aggregates per-question hybrid evaluation results into a topic-level score,
and flags each topic as "weak" or "strong" based on threshold.
"""

from collections import defaultdict

WEAK_TOPIC_THRESHOLD = 70.0


def aggregate_topic_scores(question_results: list, threshold: float = WEAK_TOPIC_THRESHOLD) -> dict:
    """
    Rolls up a flat list of per-question results into a topic-level
    breakdown, marks-weighted across all topics.
    """
    topic_totals = defaultdict(lambda: {"marks_awarded": 0.0, "max_marks": 0.0})

    for entry in question_results:
        topic = entry["topic"]
        topic_totals[topic]["marks_awarded"] += entry["marks_awarded"]
        topic_totals[topic]["max_marks"] += entry["max_marks"]

    topics = {}
    weak_topics = []
    strong_topics = []

    overall_awarded = 0.0
    overall_max = 0.0

    for topic, totals in topic_totals.items():
        marks_awarded = totals["marks_awarded"]
        max_marks = totals["max_marks"]

        percentage = round((marks_awarded / max_marks) * 100, 2) if max_marks > 0 else 0.0
        status = "weak" if percentage < threshold else "strong"

        topics[topic] = {
            "marks_awarded": round(marks_awarded, 2),
            "max_marks": round(max_marks, 2),
            "percentage": percentage,
            "status": status,
        }

        if status == "weak":
            weak_topics.append(topic)
        else:
            strong_topics.append(topic)

        overall_awarded += marks_awarded
        overall_max += max_marks

    overall_percentage = round((overall_awarded / overall_max) * 100, 2) if overall_max > 0 else 0.0

    return {
        "topics": topics,
        "weak_topics": weak_topics,
        "strong_topics": strong_topics,
        "overall_percentage": overall_percentage,
    }