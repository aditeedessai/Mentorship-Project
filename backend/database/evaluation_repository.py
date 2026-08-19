import json

from backend.database.database import get_connection


def save_evaluation(
    question_id: str,
    student_answer: str,
    evaluation: dict,
    attempt_id: str = None
):
    """
    Save a student's evaluation result to the database.

    If attempt_id is provided, the evaluation is associated
    with that complete quiz attempt.
    """

    connection = get_connection()

    try:
        connection.execute(
            """
            INSERT INTO evaluations (
                attempt_id,
                question_id,
                student_answer,
                semantic_score,
                concept_score,
                final_score,
                marks_awarded,
                matched_concepts,
                missed_concepts
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                attempt_id,
                question_id,
                student_answer,
                evaluation.get("semantic_score"),
                evaluation.get("concept_score"),
                evaluation["final_score"],
                evaluation["marks_awarded"],
                json.dumps(
                    evaluation.get("matched_concepts")
                ),
                json.dumps(
                    evaluation.get("missed_concepts")
                )
            )
        )

        connection.commit()

    finally:
        connection.close()

def _format_eval_dict(row: dict) -> dict:
    d = dict(row)
    for field in ("semantic_score", "concept_score", "final_score", "marks_awarded", "max_marks"):
        if d.get(field) is not None:
            d[field] = float(d[field])
    return d


def get_evaluations_by_attempt(attempt_id: str):
    """Return all saved question evaluations for one quiz attempt."""
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT attempt_id, question_id, student_answer, semantic_score,
                   concept_score, final_score, marks_awarded,
                   matched_concepts, missed_concepts
            FROM evaluations
            WHERE attempt_id = ?
            ORDER BY id
            """,
            (attempt_id,),
        ).fetchall()
        return [_format_eval_dict(row) for row in rows]
    finally:
        connection.close()


def get_evaluations_with_question_details(attempt_id: str):
    """
    Return saved evaluations joined with question metadata (question_type, topic, max_marks).
    """
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT 
                e.attempt_id,
                e.question_id,
                e.student_answer,
                e.semantic_score,
                e.concept_score,
                e.final_score,
                e.marks_awarded,
                e.matched_concepts,
                e.missed_concepts,
                q.question_type,
                q.topic,
                COALESCE(q.marks, CASE WHEN q.question_type = 'mcq' THEN 2.0 ELSE 10.0 END) AS max_marks
            FROM evaluations e
            LEFT JOIN questions q ON e.question_id = q.question_id
            WHERE e.attempt_id = ?
            ORDER BY e.id ASC
            """,
            (attempt_id,),
        ).fetchall()
        return [_format_eval_dict(row) for row in rows]
    finally:
        connection.close()

