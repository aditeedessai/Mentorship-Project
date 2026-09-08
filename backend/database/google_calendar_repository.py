"""
Database operations for the google_calendar_connections and
google_calendar_events tables.

Follows the existing repository pattern (get_connection, '?' placeholders via
ConnectionWrapper, dict-row returns).
"""

from datetime import datetime, timezone
import uuid

from backend.database.database import get_connection


# ── google_calendar_connections ──────────────────────────────────────


def save_connection(
    user_id: str,
    google_email: str | None,
    encrypted_refresh_token: str,
    access_token: str | None = None,
    token_expiry: str | None = None,
) -> dict:
    """
    Insert or update (upsert) a Google Calendar connection for *user_id*.

    Uses Postgres ``ON CONFLICT (user_id) DO UPDATE`` so reconnecting simply
    overwrites the existing row instead of raising a uniqueness error.
    """
    connection = get_connection()
    conn_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    try:
        connection.execute(
            """
            INSERT INTO google_calendar_connections (
                id, user_id, google_email, encrypted_refresh_token,
                access_token, token_expiry, is_active, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, true, ?, ?)
            ON CONFLICT (user_id) DO UPDATE SET
                google_email            = EXCLUDED.google_email,
                encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
                access_token            = EXCLUDED.access_token,
                token_expiry            = EXCLUDED.token_expiry,
                is_active               = true,
                updated_at              = EXCLUDED.updated_at
            """,
            (
                conn_id,
                user_id,
                google_email,
                encrypted_refresh_token,
                access_token,
                token_expiry,
                now,
                now,
            ),
        )
        connection.commit()
    finally:
        connection.close()

    return get_connection_by_user(user_id) or {}


def get_connection_by_user(user_id: str) -> dict | None:
    """Return the Google Calendar connection row for *user_id*, or ``None``."""
    connection = get_connection()
    try:
        row = connection.execute(
            """
            SELECT id, user_id, google_email, encrypted_refresh_token,
                   access_token, token_expiry, is_active, created_at, updated_at
            FROM google_calendar_connections
            WHERE user_id = ? AND is_active = true
            """,
            (user_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        connection.close()


def update_access_token(
    user_id: str,
    access_token: str,
    token_expiry: str | None = None,
) -> None:
    """Update only the access token and its expiry for an existing connection."""
    connection = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    try:
        connection.execute(
            """
            UPDATE google_calendar_connections
            SET access_token = ?, token_expiry = ?, updated_at = ?
            WHERE user_id = ?
            """,
            (access_token, token_expiry, now, user_id),
        )
        connection.commit()
    finally:
        connection.close()


def delete_connection(user_id: str) -> bool:
    """Delete the Google Calendar connection for *user_id*."""
    connection = get_connection()
    try:
        cursor = connection.execute(
            "DELETE FROM google_calendar_connections WHERE user_id = ?",
            (user_id,),
        )
        connection.commit()
        return cursor.rowcount > 0
    finally:
        connection.close()


# ── google_calendar_events ───────────────────────────────────────────


def save_event_mapping(
    user_id: str,
    entity_type: str,
    entity_id: str,
    google_event_id: str,
) -> dict:
    """
    Insert or update the mapping between a Jot entity (task/exam) and a
    Google Calendar event ID.  Uses ``ON CONFLICT`` to stay idempotent.
    """
    connection = get_connection()
    mapping_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    try:
        connection.execute(
            """
            INSERT INTO google_calendar_events (
                id, user_id, entity_type, entity_id, google_event_id,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET
                google_event_id = EXCLUDED.google_event_id,
                updated_at      = EXCLUDED.updated_at
            """,
            (mapping_id, user_id, entity_type, entity_id, google_event_id, now, now),
        )
        connection.commit()
    finally:
        connection.close()

    return get_event_mapping(user_id, entity_type, entity_id) or {}


def get_event_mapping(
    user_id: str,
    entity_type: str,
    entity_id: str,
) -> dict | None:
    """Look up the Google Calendar event ID for a specific Jot entity."""
    connection = get_connection()
    try:
        row = connection.execute(
            """
            SELECT id, user_id, entity_type, entity_id, google_event_id,
                   created_at, updated_at
            FROM google_calendar_events
            WHERE user_id = ? AND entity_type = ? AND entity_id = ?
            """,
            (user_id, entity_type, entity_id),
        ).fetchone()
        return dict(row) if row else None
    finally:
        connection.close()


def delete_event_mapping(
    user_id: str,
    entity_type: str,
    entity_id: str,
) -> bool:
    """Delete a single entity→event mapping."""
    connection = get_connection()
    try:
        cursor = connection.execute(
            """
            DELETE FROM google_calendar_events
            WHERE user_id = ? AND entity_type = ? AND entity_id = ?
            """,
            (user_id, entity_type, entity_id),
        )
        connection.commit()
        return cursor.rowcount > 0
    finally:
        connection.close()


def delete_all_event_mappings(user_id: str) -> int:
    """Delete every entity→event mapping for *user_id* (used on disconnect)."""
    connection = get_connection()
    try:
        cursor = connection.execute(
            "DELETE FROM google_calendar_events WHERE user_id = ?",
            (user_id,),
        )
        connection.commit()
        return cursor.rowcount
    finally:
        connection.close()
