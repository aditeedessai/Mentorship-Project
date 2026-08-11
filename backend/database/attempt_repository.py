from backend.database.database import get_connection


def save_attempt(
    attempt_id: str,
    document_id: str,
    total_marks: float,
    marks_awarded: float
):
    """
    Save the result of one complete quiz attempt.
    """

    connection = get_connection()

    try:
        connection.execute(
            """
            INSERT INTO quiz_attempts (
                attempt_id,
                document_id,
                total_marks,
                marks_awarded
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                attempt_id,
                document_id,
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

def list_attempts(document_id=None):
    """Return saved quiz attempts, optionally filtered by document."""
    connection = get_connection()
    try:
        if document_id:
            rows = connection.execute(
                "SELECT attempt_id, document_id, total_marks, marks_awarded FROM quiz_attempts WHERE document_id = ? ORDER BY rowid DESC",
                (document_id,),
            ).fetchall()
        else:
            rows = connection.execute(
                "SELECT attempt_id, document_id, total_marks, marks_awarded FROM quiz_attempts ORDER BY rowid DESC"
            ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()
