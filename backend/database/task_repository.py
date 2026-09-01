import uuid
from datetime import date, datetime
from backend.database.database import get_connection


def create_task(
    name: str,
    user_id: str,
    priority: str = "medium",
    due_date: str | None = None,
    due_time: str | None = None,
    study_set_id: str | None = None,
    task_type: str = "study",
) -> dict:
    """
    Create a new task for the authenticated user.

    `due_date` defaults to today (ISO date string) when not provided.
    `study_set_id`, `due_time` are optional.
    `task_type` defaults to 'study'.
    """
    connection = get_connection()
    task_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    resolved_due_date = due_date or date.today().isoformat()
    try:
        connection.execute(
            """
            INSERT INTO tasks (
                id, user_id, name, completed, priority, due_date,
                due_time, study_set_id, task_type, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                task_id,
                user_id,
                name,
                False,
                priority,
                resolved_due_date,
                due_time,
                study_set_id,
                task_type,
                now,
                now,
            ),
        )
        connection.commit()
    finally:
        connection.close()

    created = get_task_by_id(task_id=task_id, user_id=user_id)
    if not created:
        raise RuntimeError("Task creation failed to read back created task")
    return created


def get_task_by_id(task_id: str, user_id: str) -> dict | None:
    """
    Retrieve a task by ID with user ownership check and joined study set name.
    """
    connection = get_connection()
    try:
        row = connection.execute(
            """
            SELECT
                t.id,
                t.user_id,
                t.name,
                t.completed,
                t.priority,
                t.due_date,
                t.due_time,
                t.task_type,
                t.study_set_id,
                s.name AS study_set_name,
                t.created_at,
                t.updated_at
            FROM tasks t
            LEFT JOIN study_sets s ON t.study_set_id = s.study_set_id
            WHERE t.id = ? AND t.user_id = ?
            """,
            (task_id, user_id),
        ).fetchone()

        if row is None:
            return None
        return dict(row)
    finally:
        connection.close()


def get_tasks(
    user_id: str,
    due_date: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict]:
    """
    List tasks for a user, optionally filtered by due_date or start_date/end_date range.

    Includes study_set_name joined from study_sets table.
    Orders tasks by due_date ASC, due_time ASC NULLS LAST, created_at DESC.
    """
    connection = get_connection()
    try:
        query = """
            SELECT
                t.id,
                t.user_id,
                t.name,
                t.completed,
                t.priority,
                t.due_date,
                t.due_time,
                t.task_type,
                t.study_set_id,
                s.name AS study_set_name,
                t.created_at,
                t.updated_at
            FROM tasks t
            LEFT JOIN study_sets s ON t.study_set_id = s.study_set_id
            WHERE t.user_id = ?
        """
        params: list[str] = [user_id]

        if due_date:
            query += " AND t.due_date = ?"
            params.append(due_date)
        elif start_date and end_date:
            query += " AND t.due_date >= ? AND t.due_date <= ?"
            params.extend([start_date, end_date])

        query += " ORDER BY t.due_date ASC, t.due_time ASC NULLS LAST, t.created_at DESC"

        rows = connection.execute(query, tuple(params)).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def get_tasks_for_today(user_id: str) -> list[dict]:
    """
    Convenience method for retrieving today's tasks.
    """
    today_str = date.today().isoformat()
    return get_tasks(user_id=user_id, due_date=today_str)


def update_task(task_id: str, user_id: str, updates: dict) -> dict | None:
    """
    Update selected fields of a task owned by user_id.

    Allowed keys in updates: name, priority, due_date, due_time, study_set_id, task_type, completed.
    Returns updated task dictionary or None if not found/unauthorized.
    """
    existing = get_task_by_id(task_id, user_id)
    if not existing:
        return None

    allowed_fields = {
        "name",
        "priority",
        "due_date",
        "due_time",
        "study_set_id",
        "task_type",
        "completed",
    }
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}

    if not filtered_updates:
        return existing

    now = datetime.utcnow().isoformat()
    filtered_updates["updated_at"] = now

    set_clauses = [f"{field} = ?" for field in filtered_updates.keys()]
    query = f"""
        UPDATE tasks
        SET {", ".join(set_clauses)}
        WHERE id = ? AND user_id = ?
    """
    params = list(filtered_updates.values()) + [task_id, user_id]

    connection = get_connection()
    try:
        connection.execute(query, tuple(params))
        connection.commit()
    finally:
        connection.close()

    return get_task_by_id(task_id, user_id)


def toggle_task_completion(task_id: str, user_id: str, completed: bool) -> dict | None:
    """
    Update the completed status of a task owned by user_id.
    """
    return update_task(task_id, user_id, {"completed": completed})


def delete_task(task_id: str, user_id: str) -> bool:
    """
    Delete a task by ID with user ownership check.

    Returns True if a record was deleted, False otherwise.
    """
    connection = get_connection()
    try:
        cursor = connection.execute(
            """
            DELETE FROM tasks
            WHERE id = ? AND user_id = ?
            """,
            (task_id, user_id),
        )
        connection.commit()
        return cursor.rowcount > 0
    finally:
        connection.close()

