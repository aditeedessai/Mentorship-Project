from datetime import date, timedelta

from backend.database import revision_repository, exam_repository
from backend.database.database import get_connection

# --- Accuracy-tier wait (core scheduling rule) ---------------------------
TIER_LOW_ACCURACY_MAX = 50.0
TIER_MID_ACCURACY_MAX = 75.0
TIER_LOW_WAIT_DAYS = 1
TIER_MID_WAIT_DAYS = 3
TIER_HIGH_WAIT_DAYS = 6

MAX_ATTEMPTS = 4

# Exam-aware pacing
EXAM_BUFFER_DAYS = 1
EXAM_CRUNCH_MIN_DAYS_FOR_SPACING = 2


def _tier_wait_days(accuracy: float) -> int:
    if accuracy < TIER_LOW_ACCURACY_MAX:
        return TIER_LOW_WAIT_DAYS
    if accuracy < TIER_MID_ACCURACY_MAX:
        return TIER_MID_WAIT_DAYS
    return TIER_HIGH_WAIT_DAYS


def compute_next_due(study_set_id: str, question_type: str, user_id: str) -> dict:
    """
    Computes when the next attempt for one (study_set_id, question_type)
    pair is due - the core scheduling rule, decided ONE STEP AT A TIME
    from the most recent attempt only, plus exam-aware pacing. Called
    fresh every time (by is_attempt_allowed_now()'s gate and by the
    revision-status read endpoint) - never cached, and reads the schedule
    row and the linked exam live on every call, so an exam linked or
    changed mid-schedule is picked up on the very next call with no
    special-casing needed.

    Returns {"available": bool, "reason": str | None, "next_due_date":
    date | None, "attempts_taken": int, "needs_attention": bool,
    "last_accuracy": float | None}.

    `reason` is one of "attempts_exhausted" (attempts_taken >= 4 - the
    pair is permanently closed, no more due dates are ever computed for
    it, matching the 4-attempt cap), "needs_attention", "not_yet_due", or
    None when available=True.

    No schedule row means this question_type has never been completed
    for this study set at all - every attempt is independently scoped
    from the very first one, so that's simply "available right now",
    not a blocked state (there is no separate "initial attempt" this
    used to gate on; see the pivot this was rebuilt for). A row is only
    ever created already at attempts_taken=1 (its first completion IS
    attempt #1 - see revision_repository.record_attempt_result()), so
    that state and "no row yet" are handled identically here.
    """
    schedule = revision_repository.get_schedule(study_set_id, question_type)

    if schedule is None:
        return {
            "available": True,
            "reason": None,
            "next_due_date": date.today(),
            "attempts_taken": 0,
            "needs_attention": False,
            "last_accuracy": None,
        }

    attempts_taken = schedule["attempts_taken"]
    needs_attention = schedule["needs_attention"]
    last_accuracy = schedule["last_accuracy"]

    # needs_attention is checked BEFORE the generic cap check, and
    # deliberately so: by construction (see
    # revision_repository.record_attempt_result()'s SQL), needs_attention
    # can only ever become True at the exact moment attempts_taken hits
    # the cap of 4 - there is no code path where it's True at a lower
    # attempts_taken. That means "attempts_taken >= MAX_ATTEMPTS" and
    # "needs_attention" are true SIMULTANEOUSLY in every case where
    # needs_attention matters, and checking the generic cap first would
    # make the needs_attention branch below permanently unreachable dead
    # code. Checking needs_attention first instead makes both reasons
    # genuinely distinguishable: a capped pair whose 4th attempt was
    # still weak reports "needs_attention" (the more actionable reason);
    # a capped pair whose 4th attempt finally cleared 50% reports the
    # more generic "attempts_exhausted" (mastered, just out of attempts).
    if needs_attention:
        return {
            "available": False,
            "reason": "needs_attention",
            "next_due_date": None,
            "attempts_taken": attempts_taken,
            "needs_attention": needs_attention,
            "last_accuracy": last_accuracy,
        }

    # The pair is permanently closed once capped - no more due dates are
    # ever computed for it. Reached only when NOT needs_attention (see
    # above) - i.e. the 4th attempt cleared 50%.
    if attempts_taken >= MAX_ATTEMPTS:
        return {
            "available": False,
            "reason": "attempts_exhausted",
            "next_due_date": None,
            "attempts_taken": attempts_taken,
            "needs_attention": needs_attention,
            "last_accuracy": last_accuracy,
        }

    today = date.today()

    # attempts_taken == 0 is unreachable here by construction - a
    # schedule row only ever comes into existence already at
    # attempts_taken=1 (see record_attempt_result()), and that case is
    # handled by the `schedule is None` branch above. Every row reaching
    # this point has a real last_attempt_at to compute a wait from.
    last_attempt_date = schedule["last_attempt_at"].date()
    tier_wait_days = _tier_wait_days(last_accuracy)
    next_due_date = last_attempt_date + timedelta(days=tier_wait_days)

    exam = exam_repository.get_nearest_upcoming_exam_for_study_set(study_set_id, user_id)
    if exam is not None:
        days_until_exam = (exam["exam_date"] - today).days
        effective_days_until_exam = days_until_exam - EXAM_BUFFER_DAYS

        if tier_wait_days <= effective_days_until_exam:
            # The normal wait fits before the exam - use it unchanged.
            pass
        elif effective_days_until_exam >= EXAM_CRUNCH_MIN_DAYS_FOR_SPACING:
            # Doesn't fit, but there's still room to space out whatever
            # attempts remain evenly across the days left - ignoring the
            # accuracy-tier wait for this calculation entirely.
            remaining_attempts = MAX_ATTEMPTS - attempts_taken
            attempts_that_fit = min(remaining_attempts, effective_days_until_exam)
            interval = max(1, effective_days_until_exam // attempts_that_fit)
            next_due_date = last_attempt_date + timedelta(days=interval)
        else:
            # Fewer than 2 days remain - no spacing at all, any
            # remaining attempts can be taken back-to-back, same day.
            # Never blocks scheduling entirely.
            next_due_date = today

    return {
        "available": next_due_date <= today,
        "reason": None if next_due_date <= today else "not_yet_due",
        "next_due_date": next_due_date,
        "attempts_taken": attempts_taken,
        "needs_attention": needs_attention,
        "last_accuracy": last_accuracy,
    }


def is_attempt_allowed_now(study_set_id: str, question_type: str, user_id: str) -> tuple[bool, str | None]:
    """
    The full attempt-start gate for one (study_set_id, question_type)
    pair. Used to be two checks - a separate "has the study set's initial
    attempt been completed" gate plus this due-date check - but that
    first gate is gone: there is no longer a shared, study-set-wide
    precondition every type depends on. "Has this specific type ever been
    completed before" and "does a schedule row exist for it" are now the
    exact same fact (see compute_next_due()'s docstring), so
    compute_next_due() already covers everything this function used to
    need a separate list_attempts() lookup for.

    Returns (allowed, reason_if_not) - reason is a short machine-readable
    string suitable for an HTTPException detail, or None when allowed.
    """
    due_info = compute_next_due(study_set_id, question_type, user_id)

    # Re-checked explicitly here as defense-in-depth, even though
    # compute_next_due() already returns available=False whenever
    # needs_attention is true - keeps the "don't let a capped, still-weak
    # pair silently keep accepting attempts" rule visible at the gate
    # itself, not just implied by a generic availability flag.
    if due_info["needs_attention"]:
        return False, "needs_attention"

    if not due_info["available"]:
        return False, due_info["reason"]

    return True, None


def record_attempt_result(attempt: dict) -> None:
    """
    Called right after an attempt's answers are saved and its
    quiz_attempts row is updated (see
    evaluation_service.evaluate_and_save_attempt_answers()). Reads the
    real accuracy for this (attempt_id, question_type) from
    attempt_section_scores - the live view, not a re-derivation - then
    records the result into the matching revision_schedules row. Runs
    unconditionally for every attempt now (there is no other kind) - this
    call is what creates a study_set/question_type pair's schedule row
    the first time it's ever completed, as well as incrementing it on
    every completion after that (see
    revision_repository.record_attempt_result()).

    `attempt` must have attempt_id, user_id, study_set_id, and
    question_type (question_type is the attempt's locked type - every
    attempt has exactly one section, so there is exactly one
    attempt_section_scores row to read here).
    """
    attempt_id = attempt["attempt_id"]
    user_id = attempt["user_id"]
    study_set_id = attempt["study_set_id"]
    question_type = attempt["question_type"]

    connection = get_connection()
    try:
        row = connection.execute(
            """
            SELECT accuracy_percentage
            FROM attempt_section_scores
            WHERE attempt_id = ? AND question_type = ?
            """,
            (attempt_id, question_type),
        ).fetchone()
    finally:
        connection.close()

    accuracy = float(row["accuracy_percentage"]) if row and row["accuracy_percentage"] is not None else 0.0

    revision_repository.record_attempt_result(
        user_id=user_id,
        study_set_id=study_set_id,
        question_type=question_type,
        attempt_id=attempt_id,
        accuracy=accuracy,
    )
