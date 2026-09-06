from backend.database.database import get_connection


def get_student_profile(user_id: str) -> dict | None:
    """
    Fetches the student's educational qualification fields from the
    student_profiles table.

    Returns a dict with keys 'grade_or_year', 'field_stream', and
    'curriculum_type', or None if no profile exists for this user.
    """
    connection = get_connection()
    try:
        cursor = connection.execute(
            "SELECT grade_or_year, field_stream, curriculum_type "
            "FROM student_profiles WHERE user_id = ? LIMIT 1",
            (user_id,)
        )
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None
    finally:
        connection.close()
