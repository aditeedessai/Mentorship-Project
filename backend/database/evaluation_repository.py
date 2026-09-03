import json
from calendar import monthrange
from datetime import date, timedelta

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
        if attempt_id:
            connection.execute(
                "DELETE FROM evaluations WHERE attempt_id = ? AND question_id = ?",
                (attempt_id, question_id)
            )

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
    for field in ("matched_concepts", "missed_concepts", "options"):
        if isinstance(d.get(field), str):
            try:
                d[field] = json.loads(d[field])
            except Exception:
                pass
    return d


def get_evaluations_by_attempt(attempt_id: str):
    """Return all saved question evaluations for one quiz attempt."""
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT id, attempt_id, question_id, student_answer, semantic_score,
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


def get_evaluated_question_types_by_study_set(user_id: str):
    """
    Return (study_set_id, question_type) for every evaluation recorded
    across ALL of the user's quiz attempts - not just one attempt_id like
    get_evaluations_with_question_details() does. Used to derive
    per-study-set section completion for the dashboard progress card
    (see evaluation_service.get_study_set_progress()), which needs to
    know completion across every attempt ever taken under a study set,
    not just whichever one is currently 'in_progress'.
    """
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT qa.study_set_id AS study_set_id, q.question_type AS question_type
            FROM evaluations e
            JOIN quiz_attempts qa ON qa.attempt_id = e.attempt_id
            LEFT JOIN questions q ON q.question_id = e.question_id
            WHERE qa.user_id = ?
            """,
            (user_id,)
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def get_results_summary_by_study_set(study_set_id: str) -> list[dict]:
    """
    Cumulative, cross-attempt performance per question_type for one study
    set - every evaluation ever recorded across EVERY attempt of that
    type, not just the most recent one. Backs the study set's "View
    Results" entry point (StudySetHeroHeaderCard), which has no single
    attempt_id to scope to - unlike get_evaluations_with_question_details()
    (one attempt) or attempt_section_scores (still one row per attempt),
    this rolls ALL of a type's attempts into one row so no historical
    section ever goes missing from the breakdown.

    total_attempted counts every evaluation row (a skipped question still
    got a row written for it - see evaluation_service.py's skip handling -
    so it counts as "attempted", consistent with how the rest of the app
    treats skipped questions as 0-scoring attempts, not absences).
    total_correct uses the same >= 0.55 final_score threshold the
    /attempts/{id}/evaluations route already uses to derive is_correct,
    so this list's numbers agree with what a student sees on a per-attempt
    results page.
    """
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT
                q.question_type AS question_type,
                COUNT(*) AS total_attempted,
                COUNT(*) FILTER (WHERE e.final_score >= 0.55) AS total_correct,
                COUNT(DISTINCT qa.attempt_id) AS attempts_taken,
                MAX(e.created_at) AS last_attempt_at
            FROM evaluations e
            JOIN questions q ON q.question_id = e.question_id
            JOIN quiz_attempts qa ON qa.attempt_id = e.attempt_id
            WHERE qa.study_set_id = ?
            GROUP BY q.question_type
            ORDER BY q.question_type
            """,
            (study_set_id,),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def get_studied_dates(user_id: str, year: int, month: int) -> list[int]:
    """
    Return the distinct day-of-month numbers (1-31) within the given
    year/month where the user answered at least one question, across
    every study set and question type - for the Activity calendar card.

    evaluations.created_at is when an answer was actually saved (set the
    moment evaluate_and_save_attempt_answers() records it), so it's the
    accurate source for "the date the user answered a question" -
    quiz_attempts.created_at only marks when the attempt/session itself
    started, not each individual answer.

    Ownership is enforced via quiz_attempts.user_id (evaluations has no
    user_id column of its own) - same join used by
    get_evaluated_question_types_by_study_set().
    """
    connection = get_connection()
    try:
        month_start = date(year, month, 1)
        days_in_month = monthrange(year, month)[1]
        next_month_start = date(year, month, days_in_month) + timedelta(days=1)

        rows = connection.execute(
            """
            SELECT DISTINCT EXTRACT(DAY FROM e.created_at)::int AS day
            FROM evaluations e
            JOIN quiz_attempts qa ON qa.attempt_id = e.attempt_id
            WHERE qa.user_id = ? AND e.created_at >= ? AND e.created_at < ?
            ORDER BY day
            """,
            (user_id, month_start.isoformat(), next_month_start.isoformat())
        ).fetchall()
        return [row["day"] for row in rows]
    finally:
        connection.close()


def get_evaluations_with_question_details(attempt_id: str):
    """
    Return saved evaluations joined with question metadata (question_text, question_type, topic, reference_answer, correct_option, options, max_marks).
    """
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT 
                e.id,
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
                q.question AS question_text,
                q.reference_answer,
                q.correct_option,
                q.options,
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


