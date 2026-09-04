import uuid
from datetime import datetime
from backend.database.database import get_connection


def create_exam(
    subject: str,
    exam_type: str,
    exam_date: str,
    user_id: str,
    study_set_id: str | None = None
) -> dict:
    """
    Create a new exam for the authenticated user.
    """
    connection = get_connection()
    exam_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    try:
        connection.execute(
            """
            INSERT INTO exams (id, user_id, study_set_id, subject, exam_type, exam_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (exam_id, user_id, study_set_id, subject, exam_type, exam_date, now, now)
        )
        connection.commit()
        return {
            "id": exam_id,
            "user_id": user_id,
            "study_set_id": study_set_id,
            "subject": subject,
            "exam_type": exam_type,
            "exam_date": exam_date,
            "created_at": now,
            "updated_at": now
        }
    finally:
        connection.close()


def get_exams(user_id: str) -> list[dict]:
    """
    List all upcoming exams for a user, nearest exam_date first.

    There's no scheduler in this project to prune past exams, so this
    deletes any of the user's exams whose exam_date has already passed
    before selecting - every dashboard load doubles as the cleanup, and
    a past exam is never returned even for a moment.

    Ownership is enforced here (not left to RLS) since the backend
    connects with elevated (service-role) access and bypasses RLS -
    same reasoning as study_set_repository.list_study_sets() and
    task_repository.get_tasks_for_today().
    """
    connection = get_connection()
    try:
        connection.execute(
            """
            DELETE FROM exams
            WHERE user_id = ? AND exam_date < CURRENT_DATE
            """,
            (user_id,)
        )
        connection.commit()

        rows = connection.execute(
            """
            SELECT id, user_id, study_set_id, subject, exam_type, exam_date, created_at, updated_at
            FROM exams
            WHERE user_id = ?
            ORDER BY exam_date ASC
            """,
            (user_id,)
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def get_nearest_upcoming_exam_for_study_set(study_set_id: str, user_id: str) -> dict | None:
    """
    The single nearest upcoming exam linked to a study set, or None if
    none is linked (or every linked exam has already passed).

    Mirrors get_exams()'s "delete past exams, then select" pattern for
    the same reason - no scheduler prunes past exams elsewhere in this
    project. A plain live SELECT against the exams table, executed fresh
    on every call, with no caching or memoization anywhere in this
    function or its call path - this is deliberate: revision_service's
    due-date computation depends on this reflecting an exam the instant
    it's linked (or its date changed), even mid-schedule, not a snapshot
    from whenever this was first called.

    Ownership enforced directly (not via RLS - see get_exams()'s
    docstring for why).
    """
    connection = get_connection()
    try:
        connection.execute(
            """
            DELETE FROM exams
            WHERE user_id = ? AND exam_date < CURRENT_DATE
            """,
            (user_id,)
        )
        connection.commit()

        row = connection.execute(
            """
            SELECT id, user_id, study_set_id, subject, exam_type, exam_date, created_at, updated_at
            FROM exams
            WHERE user_id = ? AND study_set_id = ? AND exam_date >= CURRENT_DATE
            ORDER BY exam_date ASC
            LIMIT 1
            """,
            (user_id, study_set_id)
        ).fetchone()

        if row is None:
            return None

        return dict(row)
    finally:
        connection.close()


def delete_exam(exam_id: str, user_id: str) -> bool:
    """
    Delete an exam by ID with user ownership check.

    Only deletes if exam_id and user_id both match - same pattern as
    task_repository.delete_task(). Returns True if a record was
    deleted, False otherwise.
    """
    connection = get_connection()
    try:
        cursor = connection.execute(
            """
            DELETE FROM exams
            WHERE id = ? AND user_id = ?
            """,
            (exam_id, user_id)
        )
        connection.commit()
        return cursor.rowcount > 0
    finally:
        connection.close()
