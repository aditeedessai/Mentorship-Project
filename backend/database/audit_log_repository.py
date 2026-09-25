from backend.database.database import get_connection


def create_audit_log(user_id: str | None, action: str) -> None:
    """
    Create an application-level audit record.
    """
    connection = get_connection()
    try:
        connection.execute(
            """
            INSERT INTO public.audit_logs (user_id, action)
            VALUES (?, ?)
            """,
            (user_id, action),
        )
        connection.commit()
    finally:
        connection.close()