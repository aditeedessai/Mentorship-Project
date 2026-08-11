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
        return [dict(row) for row in rows]
    finally:
        connection.close()
