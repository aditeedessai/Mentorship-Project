import uuid
from datetime import date, datetime
from backend.database.database import get_connection


def create_task(
    name: str,
    user_id: str,
    priority: str = "medium",
    due_date: str | None = None
) -> dict:
    """
    Create a new task for the authenticated user.

    `due_date` defaults to today (ISO date string) when not provided.
    """
    connection = get_connection()
    task_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    resolved_due_date = due_date or date.today().isoformat()
    try:
        connection.execute(
            """
            INSERT INTO tasks (id, user_id, name, completed, priority, due_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (task_id, user_id, name, False, priority, resolved_due_date, now, now)
        )
        connection.commit()
        return {
            "id": task_id,
            "user_id": user_id,
            "name": name,
            "completed": False,
            "priority": priority,
            "due_date": resolved_due_date,
            "created_at": now,
            "updated_at": now
        }
    finally:
        connection.close()


def get_tasks_for_today(user_id: str) -> list[dict]:
    """
    List tasks due today for a user, most recently created first.

    Ownership is enforced here (not left to RLS) since the backend
    connects with elevated (service-role) access and bypasses RLS -
    same reasoning as study_set_repository.list_study_sets().
    """
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT id, user_id, name, completed, priority, due_date, created_at, updated_at
            FROM tasks
            WHERE user_id = ? AND due_date = CURRENT_DATE
            ORDER BY created_at DESC
            """,
            (user_id,)
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def delete_task(task_id: str, user_id: str) -> bool:
    """
    Delete a task by ID with user ownership check.

    Only deletes if task_id and user_id both match - same pattern as
    study_set_repository.delete_study_set(). Returns True if a record
    was deleted, False otherwise.
    """
    connection = get_connection()
    try:
        cursor = connection.execute(
            """
            DELETE FROM tasks
            WHERE id = ? AND user_id = ?
            """,
            (task_id, user_id)
        )
        connection.commit()
        return cursor.rowcount > 0
    finally:
        connection.close()
