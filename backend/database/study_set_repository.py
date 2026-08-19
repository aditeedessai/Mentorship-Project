from datetime import datetime
from backend.database.database import get_connection


def create_study_set(study_set_id: str, name: str) -> dict:
    """
    Create a new study_set entry.
    """
    connection = get_connection()
    now = datetime.utcnow().isoformat()
    try:
        connection.execute(
            """
            INSERT INTO study_sets (study_set_id, name, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (study_set_id, name, now, now)
        )
        connection.commit()
        return {
            "study_set_id": study_set_id,
            "name": name,
            "created_at": now,
            "updated_at": now
        }
    finally:
        connection.close()


def get_study_set(study_set_id: str) -> dict | None:
    """
    Retrieve a study set by ID.
    """
    connection = get_connection()
    try:
        row = connection.execute(
            """
            SELECT study_set_id, name, created_at, updated_at
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


def list_study_sets() -> list[dict]:
    """
    List all study sets ordered by creation time descending.
    """
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT study_set_id, name, created_at, updated_at
            FROM study_sets
            ORDER BY created_at DESC
            """
        ).fetchall()
        return [dict(row) for row in rows]
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
