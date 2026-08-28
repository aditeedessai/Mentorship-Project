import os
from pathlib import Path

import requests
from dotenv import load_dotenv

from backend.database.attempt_repository import delete_attempts_for_user

BACKEND_DIR = Path(__file__).resolve().parents[1]  # backend/services/account_service.py -> backend/
load_dotenv(BACKEND_DIR / ".env")


def _get_supabase_admin_config() -> tuple[str, str]:
    """
    Reads the Supabase project URL and the service-role SECRET key -
    NOT the anon/publishable key deps.get_supabase_auth_config() falls
    back to - since only the secret key is authorized to call Auth's
    admin endpoints. This must never be sent to the frontend.
    """
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    secret_key = os.getenv("SUPABASE_SECRET_KEY", "")
    return url, secret_key


def delete_own_account(user_id: str) -> None:
    """
    Permanently deletes a user's Supabase Auth account and everything
    that depends on it.

    study_sets, tasks, and exams each have
    `user_id uuid references auth.users(id) on delete cascade`, so
    deleting the auth user cleans those up automatically - and
    study_sets' own cascade further removes documents/document_chunks/
    questions/question_sources transitively, since those cascade off
    study_set_id.

    quiz_attempts is NOT covered by that cascade: its study_set_id
    column uses ON DELETE SET NULL rather than CASCADE (deliberately -
    see attempt_repository.get_attempt()'s docstring: historical results
    are meant to survive a deleted study set), and no migration in this
    project gives quiz_attempts.user_id its own FK to auth.users. Left
    alone, a deleted user's quiz_attempts - and their evaluations, which
    DO cascade off quiz_attempts.attempt_id - would become permanent
    orphans once the account is gone. So those are deleted explicitly
    here, before the irreversible auth-user delete, while ownership is
    still unambiguous.

    `user_id` must be the caller's own id from their verified token
    (see routes/account.py) - this function has no way to distinguish
    "my own account" from "someone else's" on its own, so that check has
    to happen before this is ever called.
    """
    delete_attempts_for_user(user_id)

    supabase_url, secret_key = _get_supabase_admin_config()
    if not supabase_url or not secret_key:
        raise RuntimeError(
            "Supabase admin configuration is missing (SUPABASE_URL / SUPABASE_SECRET_KEY)"
        )

    response = requests.delete(
        f"{supabase_url}/auth/v1/admin/users/{user_id}",
        headers={
            "apikey": secret_key,
            "Authorization": f"Bearer {secret_key}",
        },
        timeout=10.0,
    )

    if response.status_code not in (200, 204):
        raise RuntimeError(
            f"Failed to delete Supabase auth user (status {response.status_code}): {response.text}"
        )
