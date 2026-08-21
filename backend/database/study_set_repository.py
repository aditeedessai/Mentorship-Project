import sqlite3
from datetime import datetime
from backend.database.database import get_connection


def create_study_set(study_set_id: str, name: str, user_id: str = None) -> dict:
    """
    Create a new study_set entry.

    `user_id` should be the authenticated Supabase user's id (from
    auth.users, extracted server-side from their verified JWT) - this is
    what ties the study set to whoever created it. Optional and defaults
    to None for backward compatibility with existing unauthenticated call
    sites (e.g. study_service.run_study_flow's CLI flow) - any FastAPI
    route serving a logged-in user should always pass the real user_id.
    """
    connection = get_connection()
    now = datetime.utcnow().isoformat()
    try:
        connection.execute(
            """
            INSERT INTO study_sets (study_set_id, name, user_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (study_set_id, name, user_id, now, now)
        )
        connection.commit()
        return {
            "study_set_id": study_set_id,
            "name": name,
            "user_id": user_id,
            "created_at": now,
            "updated_at": now
        }
    finally:
        connection.close()


def get_study_set(study_set_id: str, user_id: str = None) -> dict | None:
    """
    Retrieve a study set by ID.

    If `user_id` is provided, this also enforces ownership: a study set
    belonging to a different user (or with no owner at all) returns None,
    exactly as if it didn't exist. The backend connects with elevated
    (service-role) access and bypasses RLS entirely, so this check has to
    happen here in Python - RLS alone does NOT protect this query when
    called from FastAPI. Pass user_id from every authenticated route;
    omit it only for internal/admin call sites that intentionally need
    unrestricted access.
    """
    connection = get_connection()
    try:
        if user_id:
            row = connection.execute(
                """
                SELECT study_set_id, name, user_id, created_at, updated_at
                FROM study_sets
                WHERE study_set_id = ? AND user_id = ?
                """,
                (study_set_id, user_id)
            ).fetchone()
        else:
            row = connection.execute(
                """
                SELECT study_set_id, name, user_id, created_at, updated_at
                FROM study_sets
                WHERE study_set_id = ?
                """,
                (study_set_id,)
            ).fetchone()

        if row is None:
            return None
        return dict(row)
    finally:
        connection.close()


def list_study_sets(user_id: str = None) -> list[dict]:
    """
    List study sets ordered by creation time descending.

    If `user_id` is provided, only that user's own study sets are
    returned - same reasoning as get_study_set(): this filtering must
    happen here, not left to RLS, since the backend's connection bypasses
    RLS. Every authenticated FastAPI route listing a user's study sets
    MUST pass their user_id here, or it will return every user's data.
    Omitting user_id (None) returns everything - only appropriate for
    internal/admin use, never for a per-user endpoint.
    """
    connection = get_connection()
    try:
        if user_id:
            rows = connection.execute(
                """
                SELECT study_set_id, name, user_id, created_at, updated_at
                FROM study_sets
                WHERE user_id = ?
                ORDER BY created_at DESC
                """,
                (user_id,)
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT study_set_id, name, user_id, created_at, updated_at
                FROM study_sets
                ORDER BY created_at DESC
                """
            ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def delete_study_set(study_set_id: str, user_id: str = None) -> bool:
    """
    Delete a study set by ID with user ownership check.

    If `user_id` is provided, enforces ownership (only deletes if study_set_id
    and user_id both match). Returns True if a record was deleted, False otherwise.
    """
    connection = get_connection()
    try:
        if user_id:
            cursor = connection.execute(
                """
                DELETE FROM study_sets
                WHERE study_set_id = ? AND user_id = ?
                """,
                (study_set_id, user_id)
            )
        else:
            cursor = connection.execute(
                """
                DELETE FROM study_sets
                WHERE study_set_id = ?
                """,
                (study_set_id,)
            )
        connection.commit()
        return cursor.rowcount > 0
    finally:
        connection.close()


def update_study_set_timestamp(study_set_id: str):
    """
    Update the updated_at timestamp of a study set.
    """
    connection = get_connection()
    now = datetime.utcnow().isoformat()
    try:
        connection.execute(
            """
            UPDATE study_sets
            SET updated_at = ?
            WHERE study_set_id = ?
            """,
            (now, study_set_id)
        )
        connection.commit()
    finally:
        connection.close()


def create_document(
    document_id: str,
    study_set_id: str,
    file_path: str,
    file_name: str
) -> dict:
    """
    Register a document belonging to a study set.
    """
    connection = get_connection()
    now = datetime.utcnow().isoformat()
    try:
        connection.execute(
            """
            INSERT INTO documents (document_id, study_set_id, file_path, file_name, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (document_id, study_set_id, file_path, file_name, now)
        )
        connection.commit()
        return {
            "document_id": document_id,
            "study_set_id": study_set_id,
            "file_path": file_path,
            "file_name": file_name,
            "created_at": now
        }
    finally:
        connection.close()


def get_documents_by_study_set(study_set_id: str) -> list[dict]:
    """
    Retrieve all documents associated with a study set.
    """
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT document_id, study_set_id, file_path, file_name, created_at
            FROM documents
            WHERE study_set_id = ?
            ORDER BY created_at ASC
            """,
            (study_set_id,)
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def get_document_by_id(document_id: str) -> dict | None:
    """
    Retrieve a document by its document_id.
    """
    connection = get_connection()
    try:
        row = connection.execute(
            """
            SELECT document_id, study_set_id, file_path, file_name, created_at
            FROM documents
            WHERE document_id = ?
            """,
            (document_id,)
        ).fetchone()

        if row is None:
            return None
        return dict(row)
    finally:
        connection.close()