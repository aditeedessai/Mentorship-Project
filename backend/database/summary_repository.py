import json

from backend.database.database import get_connection


def _parse_json_field(val, default=None):
    if default is None:
        default = []
    if val is None:
        return default
    if isinstance(val, str):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return default
    return val


def save_summary(
    study_set_id: str,
    user_id: str,
    title: str,
    overview_paragraphs: list,
    key_takeaways: list,
) -> dict:
    """
    Upsert the summary for a study set, keyed on study_set_id (one row per
    study set - "Regenerate Summary" overwrites in place rather than
    keeping history, matching study_set_summaries' unique constraint).
    """
    connection = get_connection()
    try:
        row = connection.execute(
            """
            INSERT INTO study_set_summaries (
                study_set_id, user_id, title, overview_paragraphs, key_takeaways, updated_at
            )
            VALUES (?, ?, ?, ?, ?, now())
            ON CONFLICT (study_set_id) DO UPDATE SET
                title = EXCLUDED.title,
                overview_paragraphs = EXCLUDED.overview_paragraphs,
                key_takeaways = EXCLUDED.key_takeaways,
                updated_at = now()
            RETURNING id, study_set_id, user_id, title, overview_paragraphs, key_takeaways, created_at, updated_at
            """,
            (
                study_set_id,
                user_id,
                title,
                json.dumps(overview_paragraphs or []),
                json.dumps(key_takeaways or []),
            )
        ).fetchone()
        connection.commit()
        summary = dict(row)
        summary["overview_paragraphs"] = _parse_json_field(summary.get("overview_paragraphs"))
        summary["key_takeaways"] = _parse_json_field(summary.get("key_takeaways"))
        return summary
    finally:
        connection.close()


def get_summary(study_set_id: str, user_id: str) -> dict | None:
    """
    Ownership is enforced here (not left to RLS) since the backend
    connects with elevated (service-role) access and bypasses RLS -
    same reasoning as study_set_repository.list_study_sets().
    """
    connection = get_connection()
    try:
        row = connection.execute(
            """
            SELECT id, study_set_id, user_id, title, overview_paragraphs, key_takeaways, created_at, updated_at
            FROM study_set_summaries
            WHERE study_set_id = ? AND user_id = ?
            LIMIT 1
            """,
            (study_set_id, user_id)
        ).fetchone()
        if row is None:
            return None
        summary = dict(row)
        summary["overview_paragraphs"] = _parse_json_field(summary.get("overview_paragraphs"))
        summary["key_takeaways"] = _parse_json_field(summary.get("key_takeaways"))
        return summary
    finally:
        connection.close()
