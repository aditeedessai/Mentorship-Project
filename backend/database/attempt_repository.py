from backend.database.database import get_connection


def ensure_attempt_exists(
    attempt_id: str,
    study_set_id: str = None,
    document_id: str = None
):
    """
    Creates a placeholder quiz_attempts row if one doesn't already exist,
    doing nothing otherwise. Needed because evaluations.attempt_id has a
    real foreign key to quiz_attempts.attempt_id in Postgres (SQLite
    never enforced this) - evaluation_service.run_evaluation() saves
    individual evaluations per-question inside a loop, but only calls
    save_attempt() with real totals once, at the end. Without this, the
    very first evaluation saved for a brand-new attempt_id fails the FK
    check, since the parent row doesn't exist yet.

    ON CONFLICT DO NOTHING is deliberate here (unlike save_attempt()'s
    DO UPDATE) - this must never overwrite an attempt's already-accumulated
    marks/status back to the 0/in_progress placeholder on a later call.
    """
    connection = get_connection()

    doc_id = document_id or None
    set_id = study_set_id or None

    try:
        connection.execute(
            """
            INSERT INTO quiz_attempts (
                attempt_id,
                study_set_id,
                document_id,
                total_marks,
                marks_awarded,
                status
            )
            VALUES (?, ?, ?, 0, 0, 'in_progress')
            ON CONFLICT (attempt_id) DO NOTHING
            """,
            (attempt_id, set_id, doc_id)
        )

        connection.commit()

    finally:
        connection.close()


def save_attempt(
    attempt_id: str,
    total_marks: float,
    marks_awarded: float,
    study_set_id: str = None,
    document_id: str = None,
    status: str = "in_progress"
):
    """
    Save the result of one quiz attempt.

    `status` is 'in_progress' by default - every call while sections are
    still being completed keeps it as-is. Callers should only pass
    status='completed' once the student has finished every section
    (see evaluation_service.run_evaluation's status parameter).
    """

    connection = get_connection()

    doc_id = document_id or None
    set_id = study_set_id or None

    try:
        connection.execute(
            """
            INSERT INTO quiz_attempts (
                attempt_id,
                study_set_id,
                document_id,
                total_marks,
                marks_awarded,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (attempt_id) DO UPDATE SET
                study_set_id = EXCLUDED.study_set_id,
                document_id = EXCLUDED.document_id,
                total_marks = EXCLUDED.total_marks,
                marks_awarded = EXCLUDED.marks_awarded,
                status = EXCLUDED.status
            """,
            (
                attempt_id,
                set_id,
                doc_id,
                total_marks,
                marks_awarded,
                status
            )
        )

        connection.commit()

    finally:
        connection.close()


def get_attempt(attempt_id: str):
    """
    Retrieve a previously saved quiz attempt.
    """

    connection = get_connection()

    try:
        row = connection.execute(
            """
            SELECT
                attempt_id,
                study_set_id,
                document_id,
                total_marks,
                marks_awarded,
                status
            FROM quiz_attempts
            WHERE attempt_id = ?
            """,
            (attempt_id,)
        ).fetchone()

        if row is None:
            return None

        return dict(row)

    finally:
        connection.close()


def list_attempts(study_set_id=None, document_id=None):
    """Return saved quiz attempts, optionally filtered by study set or document."""
    connection = get_connection()
    try:
        if study_set_id:
            rows = connection.execute(
                """
                SELECT attempt_id, study_set_id, document_id, total_marks, marks_awarded
                FROM quiz_attempts
                WHERE study_set_id = ?
                ORDER BY rowid DESC
                """,
                (study_set_id,),
            ).fetchall()
        elif document_id:
            rows = connection.execute(
                """
                SELECT attempt_id, study_set_id, document_id, total_marks, marks_awarded
                FROM quiz_attempts
                WHERE document_id = ?
                ORDER BY rowid DESC
                """,
                (document_id,),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT attempt_id, study_set_id, document_id, total_marks, marks_awarded
                FROM quiz_attempts
                ORDER BY rowid DESC
                """
            ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()