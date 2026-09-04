import logging

from backend.database.database import get_connection

logger = logging.getLogger(__name__)


def _format_schedule_dict(row: dict) -> dict:
    d = dict(row)
    if d.get("last_accuracy") is not None:
        d["last_accuracy"] = float(d["last_accuracy"])
    return d


def get_schedule(study_set_id: str, question_type: str) -> dict | None:
    """
    Retrieve the revision_schedules row for one (study_set_id,
    question_type) pair. Returns None if it doesn't exist yet - which
    means this question type has never been completed for this study set
    (see record_attempt_result(), the only place these rows are created,
    lazily, on first completion).
    """
    connection = get_connection()
    try:
        row = connection.execute(
            """
            SELECT id, user_id, study_set_id, question_type, attempts_taken,
                   last_attempt_id, last_accuracy, last_attempt_at,
                   needs_attention, created_at, updated_at
            FROM revision_schedules
            WHERE study_set_id = ? AND question_type = ?
            """,
            (study_set_id, question_type),
        ).fetchone()

        if row is None:
            return None

        return _format_schedule_dict(row)
    finally:
        connection.close()


def get_schedules_for_study_set(study_set_id: str) -> list[dict]:
    """
    Retrieve every revision_schedules row for a study set - up to one per
    question type, one per type that has been completed at least once.
    A type with no row yet simply hasn't been attempted for this study
    set - callers distinguish "never attempted" from "attempted at least
    once" by row presence, not by a status field.
    """
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT id, user_id, study_set_id, question_type, attempts_taken,
                   last_attempt_id, last_accuracy, last_attempt_at,
                   needs_attention, created_at, updated_at
            FROM revision_schedules
            WHERE study_set_id = ?
            ORDER BY question_type
            """,
            (study_set_id,),
        ).fetchall()
        return [_format_schedule_dict(row) for row in rows]
    finally:
        connection.close()


def get_schedules_for_user(user_id: str) -> list[dict]:
    """
    Retrieve every revision_schedules row across ALL of a user's study
    sets in one query - used by the planner's revisions-due aggregation
    (backend/services/revision_service.get_due_revisions_for_user()) so
    it doesn't need one query per study set. A row's mere existence means
    that (study_set, question_type) pair has been completed at least
    once - see get_schedules_for_study_set()'s docstring.
    """
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT id, user_id, study_set_id, question_type, attempts_taken,
                   last_attempt_id, last_accuracy, last_attempt_at,
                   needs_attention, created_at, updated_at
            FROM revision_schedules
            WHERE user_id = ?
            """,
            (user_id,),
        ).fetchall()
        return [_format_schedule_dict(row) for row in rows]
    finally:
        connection.close()


def record_attempt_result(
    user_id: str,
    study_set_id: str,
    question_type: str,
    attempt_id: str,
    accuracy: float,
) -> None:
    """
    Records the result of one completed attempt into its
    revision_schedules row: creates the row (attempts_taken=1) the FIRST
    time this (study_set_id, question_type) pair is ever completed, or
    increments attempts_taken on every completion after that. Sets
    needs_attention if this was the 4th attempt and accuracy is still
    below 50%.

    A real upsert now, not a plain UPDATE - unlike the old
    attempt_kind='initial'-gated model, there is no longer a separate
    event that pre-creates this row before the first real attempt; this
    function IS that creation event, for every (study_set_id,
    question_type) pair's very first completion. `user_id` is therefore
    required now too - needed to satisfy revision_schedules.user_id's
    NOT NULL constraint on that first insert (it's immutable afterward,
    same as attempt_repository.save_attempt()'s immutable fields, so
    later calls' user_id is simply unused once a row exists).

    The insert branch's needs_attention is unconditionally `false` (not
    computed) - a 1st attempt can never simultaneously be a 4th, so
    there's nothing to evaluate.

    The UPDATE branch is guarded by `WHERE revision_schedules.
    attempts_taken < 4` (postgres skips the update - and, since a
    conflict was already detected, the insert too - when this fails,
    rather than either raising or silently resetting a capped row).
    Confirmed via an earlier live test that revision_schedules.
    attempts_taken carries a DB-level CHECK (<= 4) constraint, so an
    unguarded update on an already-capped row would otherwise raise a raw
    CheckViolation instead of failing safely.
    revision_service.is_attempt_allowed_now() is what's actually
    responsible for never letting a 5th attempt start in the first place
    - this is defense-in-depth so a bug or race elsewhere can't crash the
    answer-saving flow that calls this.

    `accuracy` is a plain percentage (0-100), matching
    attempt_section_scores.accuracy_percentage - the caller
    (revision_service.record_attempt_result) is responsible for reading
    that real value before calling this.
    """
    connection = get_connection()
    try:
        cursor = connection.execute(
            """
            INSERT INTO revision_schedules (
                user_id,
                study_set_id,
                question_type,
                attempts_taken,
                last_attempt_id,
                last_accuracy,
                last_attempt_at,
                needs_attention
            )
            VALUES (?, ?, ?, 1, ?, ?, NOW(), false)
            ON CONFLICT (study_set_id, question_type) DO UPDATE SET
                attempts_taken = revision_schedules.attempts_taken + 1,
                last_attempt_id = EXCLUDED.last_attempt_id,
                last_accuracy = EXCLUDED.last_accuracy,
                last_attempt_at = EXCLUDED.last_attempt_at,
                needs_attention = (
                    revision_schedules.attempts_taken + 1 >= 4
                    AND EXCLUDED.last_accuracy < 50
                ),
                updated_at = NOW()
            WHERE revision_schedules.attempts_taken < 4
            """,
            (user_id, study_set_id, question_type, attempt_id, accuracy),
        )
        connection.commit()

        if cursor.rowcount == 0:
            logger.warning(
                "revision_repository.py: record_attempt_result() found the "
                "revision_schedules row for study_set_id=%s question_type=%s "
                "(attempt_id=%s) already at the cap of 4 attempts. No row updated.",
                study_set_id, question_type, attempt_id,
            )
    finally:
        connection.close()
