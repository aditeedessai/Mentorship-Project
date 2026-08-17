from backend.database.database import get_connection


def save_attempt(
    attempt_id: str,
    total_marks: float,
    marks_awarded: float,
    study_set_id: str = None,
    document_id: str = None
):
    """
    Save the result of one complete quiz attempt.
    """

    connection = get_connection()

    doc_id = document_id or ""
    set_id = study_set_id or ""

    try:
        connection.execute(
            """
            INSERT OR REPLACE INTO quiz_attempts (
                attempt_id,
                study_set_id,
                document_id,
                total_marks,
                marks_awarded
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                attempt_id,
                set_id,
                doc_id,
                total_marks,
                marks_awarded
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
                marks_awarded
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
