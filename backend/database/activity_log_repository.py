from calendar import monthrange
from datetime import date, timedelta

from backend.database.database import get_connection


def record_activity(user_id: str, activity_date: date | None = None) -> None:
    """
    Mark that the user studied on the given date (defaults to today).

    Idempotent - the unique (user_id, activity_date) constraint means
    calling this multiple times for the same day (e.g. one call per
    evaluation saved) only ever produces one row.
    """
    connection = get_connection()
    try:
        connection.execute(
            """
            INSERT INTO public.activity_log (user_id, activity_date)
            VALUES (?, ?)
            ON CONFLICT (user_id, activity_date) DO NOTHING
            """,
            (user_id, (activity_date or date.today()).isoformat()),
        )
        connection.commit()
    finally:
        connection.close()


def get_studied_dates(user_id: str, year: int, month: int) -> list[int]:
    """
    Return the distinct day-of-month numbers (1-31) within the given
    year/month the user studied, for the Activity calendar card.

    Reads from activity_log directly - unlike deriving this from
    evaluations/quiz_attempts, this survives the underlying study set,
    questions, or evaluations being deleted later.
    """
    connection = get_connection()
    try:
        month_start = date(year, month, 1)
        days_in_month = monthrange(year, month)[1]
        next_month_start = date(year, month, days_in_month) + timedelta(days=1)

        rows = connection.execute(
            """
            SELECT DISTINCT EXTRACT(DAY FROM activity_date)::int AS day
            FROM public.activity_log
            WHERE user_id = ? AND activity_date >= ? AND activity_date < ?
            ORDER BY day
            """,
            (user_id, month_start.isoformat(), next_month_start.isoformat()),
        ).fetchall()
        return [row["day"] for row in rows]
    finally:
        connection.close()
