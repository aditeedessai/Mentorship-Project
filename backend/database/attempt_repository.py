from backend.database.database import get_connection


def ensure_attempt_exists(
    attempt_id: str,
    study_set_id: str = None,
    document_id: str = None,
    user_id: str = None
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

    `user_id` must come from the authenticated Supabase user (never from
    the frontend/request body) and is stored directly on the row, not
    just inferred via study_set_id - this preserves ownership even if
    the underlying study set is later deleted (see delete_study_set()),
    which otherwise orphans the attempt and permanently blocks the owner
    from viewing their own historical results.

    ON CONFLICT DO NOTHING is deliberate here (unlike save_attempt()'s
    DO UPDATE) - this must never overwrite an attempt's already-accumulated
    marks/status back to the 0/in_progress placeholder on a later call.
    """
    connection = get_connection()

    doc_id = document_id or None
    set_id = study_set_id or None
    usr_id = user_id or None

    try:
        connection.execute(
            """
            INSERT INTO quiz_attempts (
                attempt_id,
                study_set_id,
                document_id,
                user_id,
                total_marks,
                marks_awarded,
                status
            )
            VALUES (?, ?, ?, ?, 0, 0, 'in_progress')
            ON CONFLICT (attempt_id) DO NOTHING
            """,
            (attempt_id, set_id, doc_id, usr_id)
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
    status: str = "in_progress",
    user_id: str = None
):
    """
    Save the result of one quiz attempt.

    `status` is 'in_progress' by default - every call while sections are
    still being completed keeps it as-is. Callers should only pass
    status='completed' once the student has finished every section
    (see evaluation_service.run_evaluation's status parameter).

    `user_id` must come from the authenticated Supabase user, never the
    frontend/request body. COALESCE in the ON CONFLICT clause means a
    later call omitting user_id won't accidentally null out an owner
    already set on an earlier call for this same attempt_id.
    """

    connection = get_connection()

    doc_id = document_id or None
    set_id = study_set_id or None
    usr_id = user_id or None

    try:
        connection.execute(
            """
            INSERT INTO quiz_attempts (
                attempt_id,
                study_set_id,
                document_id,
                user_id,
                total_marks,
                marks_awarded,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (attempt_id) DO UPDATE SET
                study_set_id = COALESCE(EXCLUDED.study_set_id, quiz_attempts.study_set_id),
                document_id = COALESCE(EXCLUDED.document_id, quiz_attempts.document_id),
                user_id = COALESCE(EXCLUDED.user_id, quiz_attempts.user_id),
                total_marks = EXCLUDED.total_marks,
                marks_awarded = EXCLUDED.marks_awarded,
                status = EXCLUDED.status,
                updated_at = NOW()
            """,
            (
                attempt_id,
                set_id,
                doc_id,
                usr_id,
                total_marks,
                marks_awarded,
                status
            )
        )

        connection.commit()

    finally:
        connection.close()


def _format_attempt_dict(row: dict) -> dict:
    d = dict(row)
    if d.get("total_marks") is not None:
        d["total_marks"] = float(d["total_marks"])
    if d.get("marks_awarded") is not None:
        d["marks_awarded"] = float(d["marks_awarded"])
    return d


def get_attempt(attempt_id: str, user_id: str = None) -> dict | None:
    """
    Retrieve a previously saved quiz attempt.

    If `user_id` is provided, ownership is checked directly against
    quiz_attempts.user_id - not via the study_set relationship. This
    preserves access to an attempt's historical results even after its
    study_set has been deleted (study_set_id becomes NULL in that case,
    per delete_study_set()'s cascade behavior) - previously, deleting a
    study set permanently orphaned every attempt under it, since there
    was no other path back to the owner. study_set_id is still stored
    and still used for the study_set relationship itself, just no
    longer relied on for ownership checks.
    """
    connection = get_connection()

    try:
        row = connection.execute(
            """
            SELECT
                attempt_id,
                study_set_id,
                document_id,
                user_id,
                total_marks,
                marks_awarded,
                status,
                created_at,
                updated_at
            FROM quiz_attempts
            WHERE attempt_id = ?
            """,
            (attempt_id,)
        ).fetchone()

        if row is None:
            return None

        attempt = _format_attempt_dict(row)

        if user_id and attempt.get("user_id") != user_id:
            return None

        return attempt

    finally:
        connection.close()


def list_attempts(study_set_id=None, document_id=None, user_id=None):
    """
    Return saved quiz attempts, optionally filtered by study set,
    document, or user. `user_id` filtering is direct against
    quiz_attempts.user_id (see get_attempt()'s docstring for why this
    doesn't go through study_set_id).
    """
    connection = get_connection()
    try:
        if user_id:
            rows = connection.execute(
                """
                SELECT attempt_id, study_set_id, document_id, user_id, total_marks, marks_awarded, status, created_at, updated_at
                FROM quiz_attempts
                WHERE user_id = ?
                ORDER BY created_at DESC
                """,
                (user_id,),
            ).fetchall()
        elif study_set_id:
            rows = connection.execute(
                """
                SELECT attempt_id, study_set_id, document_id, user_id, total_marks, marks_awarded, status, created_at, updated_at
                FROM quiz_attempts
                WHERE study_set_id = ?
                ORDER BY created_at DESC
                """,
                (study_set_id,),
            ).fetchall()
        elif document_id:
            rows = connection.execute(
                """
                SELECT attempt_id, study_set_id, document_id, user_id, total_marks, marks_awarded, status, created_at, updated_at
                FROM quiz_attempts
                WHERE document_id = ?
                ORDER BY created_at DESC
                """,
                (document_id,),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT attempt_id, study_set_id, document_id, user_id, total_marks, marks_awarded, status, created_at, updated_at
                FROM quiz_attempts
                ORDER BY created_at DESC
                """
            ).fetchall()
        return [_format_attempt_dict(row) for row in rows]
    finally:
        connection.close()


def get_active_attempt_by_study_set(study_set_id: str, user_id: str = None) -> dict | None:
    """
    Retrieve the current active ('in_progress') attempt for a given study set and user.
    Returns None if no active attempt exists (e.g. no attempt started yet, or previous attempt was completed).
    """
    connection = get_connection()
    try:
        if user_id:
            row = connection.execute(
                """
                SELECT attempt_id, study_set_id, document_id, user_id, total_marks, marks_awarded, status, created_at, updated_at
                FROM quiz_attempts
                WHERE study_set_id = ? AND user_id = ? AND status = 'in_progress'
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (study_set_id, user_id),
            ).fetchone()
        else:
            row = connection.execute(
                """
                SELECT attempt_id, study_set_id, document_id, user_id, total_marks, marks_awarded, status, created_at, updated_at
                FROM quiz_attempts
                WHERE study_set_id = ? AND status = 'in_progress'
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (study_set_id,),
            ).fetchone()

        if row is None:
            return None

        return _format_attempt_dict(row)
    finally:
        connection.close()