"""
Google Calendar integration service.

Encapsulates all Google OAuth 2.0 and Calendar API logic in one module so
that existing route files only need tiny, fire-and-forget calls.

Security invariants
-------------------
* Refresh tokens are Fernet-encrypted before persistence.
* No token is ever returned to the frontend.
* OAuth ``state`` is an HMAC-signed blob containing the user_id.
* Every public function that touches the Calendar API catches all
  exceptions internally and logs them — callers are never blocked.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv

# Load env vars from backend/.env
BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

logger = logging.getLogger(__name__)

# ── Environment variables ────────────────────────────────────────────

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8001/api/google-calendar/callback",
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
TOKEN_ENCRYPTION_KEY = os.getenv("GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY", "")

# Google OAuth
SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
]
GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"

# ── Reminder configuration (centralised, not magic numbers) ──────────

TASK_REMINDER_MINUTES = 30  # popup 30 min before a timed task
EXAM_REMINDER_MINUTES_DAY = 1440  # popup 1 day before exam (all-day)
EXAM_REMINDER_MINUTES_HOUR = 60  # popup 1 hour before exam (all-day)
# For all-day events, Google interprets reminder minutes as "minutes before
# midnight the day of the event", so 1440 = day-before at midnight.
ALLDAY_TASK_REMINDER_MINUTES = 480  # 8 hours before (morning of)


# ── Token encryption helpers ─────────────────────────────────────────

def _get_fernet():
    """Return a Fernet instance for token encryption, or None if not configured."""
    if not TOKEN_ENCRYPTION_KEY:
        logger.warning("GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY not set — tokens stored unencrypted")
        return None
    try:
        from cryptography.fernet import Fernet
        return Fernet(TOKEN_ENCRYPTION_KEY.encode() if isinstance(TOKEN_ENCRYPTION_KEY, str) else TOKEN_ENCRYPTION_KEY)
    except Exception as exc:
        logger.error("Failed to initialise Fernet: %s", exc)
        return None


def _encrypt_token(token: str) -> str:
    """Encrypt a token string. Falls back to plaintext if Fernet unavailable."""
    f = _get_fernet()
    if f:
        return f.encrypt(token.encode()).decode()
    return token


def _decrypt_token(encrypted: str) -> str:
    """Decrypt a token string. Falls back to returning as-is if Fernet unavailable."""
    f = _get_fernet()
    if f:
        try:
            return f.decrypt(encrypted.encode()).decode()
        except Exception:
            # May be a plaintext token from before encryption was configured
            return encrypted
    return encrypted


# ── OAuth state helpers ──────────────────────────────────────────────

_STATE_SECRET = (GOOGLE_CLIENT_SECRET or "fallback-state-secret").encode()


def _make_state(user_id: str) -> str:
    """Create an HMAC-signed state parameter encoding *user_id*."""
    payload = json.dumps({"uid": user_id})
    sig = hmac.new(_STATE_SECRET, payload.encode(), hashlib.sha256).hexdigest()
    import base64
    return base64.urlsafe_b64encode(json.dumps({"p": payload, "s": sig}).encode()).decode()


def _verify_state(state: str) -> str | None:
    """
    Validate *state* and return the embedded ``user_id``, or ``None`` if
    the signature is invalid.
    """
    try:
        import base64
        outer = json.loads(base64.urlsafe_b64decode(state.encode()))
        payload = outer["p"]
        sig = outer["s"]
        expected = hmac.new(_STATE_SECRET, payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        return json.loads(payload)["uid"]
    except Exception:
        return None


# ── OAuth URL generation ─────────────────────────────────────────────

def generate_auth_url(user_id: str) -> str:
    """
    Return the Google OAuth 2.0 authorization URL the frontend should
    navigate the browser to.
    """
    from urllib.parse import urlencode

    state = _make_state(user_id)
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URI}?{urlencode(params)}"


# ── OAuth code exchange ──────────────────────────────────────────────

def exchange_code(code: str, state: str) -> tuple[str | None, str | None]:
    """
    Exchange the authorization *code* for tokens, persist the connection,
    and return ``(user_id, error_message)``.

    On success ``error_message`` is ``None``; on failure ``user_id`` may
    still be populated (so the callback can redirect properly).
    """
    user_id = _verify_state(state)
    if not user_id:
        return None, "Invalid OAuth state"

    try:
        import requests as http_requests

        resp = http_requests.post(
            GOOGLE_TOKEN_URI,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=15,
        )
        if resp.status_code != 200:
            logger.error("Google token exchange failed: %s %s", resp.status_code, resp.text)
            return user_id, "Google token exchange failed"

        token_data = resp.json()
        access_token = token_data.get("access_token", "")
        refresh_token = token_data.get("refresh_token", "")
        expires_in = token_data.get("expires_in", 3600)

        if not refresh_token:
            logger.warning("No refresh_token returned — user may have already authorised without revocation")

        # Fetch the connected Google account email
        google_email = None
        try:
            info_resp = http_requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            if info_resp.status_code == 200:
                google_email = info_resp.json().get("email")
        except Exception:
            pass

        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        token_expiry = (now_utc + timedelta(seconds=int(expires_in))).isoformat()

        # Persist (encrypted refresh token)
        from backend.database import google_calendar_repository

        google_calendar_repository.save_connection(
            user_id=user_id,
            google_email=google_email,
            encrypted_refresh_token=_encrypt_token(refresh_token) if refresh_token else "",
            access_token=access_token,
            token_expiry=token_expiry,
        )

        # Run initial synchronisation (best-effort)
        try:
            initial_sync(user_id)
        except Exception as sync_exc:
            logger.error("Initial calendar sync failed for user %s: %s", user_id, sync_exc)

        return user_id, None

    except Exception as exc:
        logger.error("OAuth exchange error: %s", exc)
        return user_id, str(exc)


# ── Connection status ────────────────────────────────────────────────

def get_connection_status(user_id: str) -> dict:
    """Return ``{"connected": bool, "email": str|None}`` — safe for the frontend."""
    from backend.database import google_calendar_repository

    conn = google_calendar_repository.get_connection_by_user(user_id)
    if conn and conn.get("is_active"):
        return {"connected": True, "email": conn.get("google_email")}
    return {"connected": False, "email": None}


# ── Disconnect ───────────────────────────────────────────────────────

def disconnect(user_id: str) -> bool:
    """
    Revoke the Google Calendar connection: delete credentials and all
    event mappings.  Does NOT delete Jot tasks or exams.
    """
    from backend.database import google_calendar_repository

    # Try to revoke the access token at Google (best-effort)
    conn = google_calendar_repository.get_connection_by_user(user_id)
    if conn and conn.get("access_token"):
        try:
            import requests as http_requests
            http_requests.post(
                "https://oauth2.googleapis.com/revoke",
                params={"token": conn["access_token"]},
                timeout=10,
            )
        except Exception:
            pass

    google_calendar_repository.delete_all_event_mappings(user_id)
    return google_calendar_repository.delete_connection(user_id)


# ── Internal: build authenticated Calendar API client ────────────────

def _get_calendar_service(user_id: str):
    """
    Return a ``googleapiclient.discovery.Resource`` for the Calendar API,
    refreshing the access token if expired.  Returns ``None`` if the user
    has no active connection.
    """
    from backend.database import google_calendar_repository

    conn = google_calendar_repository.get_connection_by_user(user_id)
    if not conn or not conn.get("is_active"):
        return None

    access_token = conn.get("access_token", "")
    token_expiry_str = conn.get("token_expiry")
    encrypted_refresh = conn.get("encrypted_refresh_token", "")

    # Check if access token is expired
    needs_refresh = True
    if token_expiry_str:
        try:
            expiry = datetime.fromisoformat(str(token_expiry_str).replace("+00:00", "").replace("Z", ""))
            now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
            needs_refresh = now_utc >= expiry - timedelta(minutes=5)
        except Exception:
            needs_refresh = True

    if needs_refresh and encrypted_refresh:
        refresh_token = _decrypt_token(encrypted_refresh)
        if refresh_token:
            try:
                import requests as http_requests
                resp = http_requests.post(
                    GOOGLE_TOKEN_URI,
                    data={
                        "client_id": GOOGLE_CLIENT_ID,
                        "client_secret": GOOGLE_CLIENT_SECRET,
                        "refresh_token": refresh_token,
                        "grant_type": "refresh_token",
                    },
                    timeout=15,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    access_token = data.get("access_token", access_token)
                    expires_in = data.get("expires_in", 3600)
                    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
                    new_expiry = (now_utc + timedelta(seconds=int(expires_in))).isoformat()
                    google_calendar_repository.update_access_token(user_id, access_token, new_expiry)
                else:
                    logger.error("Token refresh failed: %s %s", resp.status_code, resp.text)
                    return None
            except Exception as exc:
                logger.error("Token refresh error: %s", exc)
                return None

    # Build the service
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        creds = Credentials(
            token=access_token,
            refresh_token=None,  # We handle refresh ourselves above
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
        )
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        return service
    except Exception as exc:
        logger.error("Failed to build Calendar service: %s", exc)
        return None


# ── Event body builders ──────────────────────────────────────────────

def _build_task_event_body(task_data: dict, timezone: str = "UTC") -> dict:
    """Build a Google Calendar event body from a Jot task dict."""
    name = task_data.get("name", "Untitled Task")
    due_date = str(task_data.get("due_date", ""))
    due_time = task_data.get("due_time")
    priority = task_data.get("priority", "medium")
    task_type = task_data.get("task_type", "study")
    study_set_name = task_data.get("study_set_name", "")

    description_parts = [
        f"Priority: {priority}",
        f"Type: {task_type}",
    ]
    if study_set_name:
        description_parts.append(f"Study Set: {study_set_name}")
    description_parts.append("Source: Jot Study Planner")
    description = "\n".join(description_parts)

    event = {
        "summary": f"Study Task: {name}",
        "description": description,
    }

    if due_time:
        # Timed event
        time_str = str(due_time)
        # Handle HH:MM:SS or HH:MM formats
        if len(time_str) == 5:
            time_str += ":00"
        start_dt = f"{due_date}T{time_str}"
        event["start"] = {"dateTime": start_dt, "timeZone": timezone}
        # Default 1 hour duration
        event["end"] = {"dateTime": start_dt, "timeZone": timezone}
        try:
            from datetime import datetime as dt_cls, timedelta as td_cls
            parsed = dt_cls.fromisoformat(start_dt)
            end = parsed + td_cls(hours=1)
            event["end"] = {"dateTime": end.isoformat(), "timeZone": timezone}
        except Exception:
            pass
        event["reminders"] = {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": TASK_REMINDER_MINUTES},
            ],
        }
    else:
        # All-day event
        event["start"] = {"date": due_date}
        event["end"] = {"date": due_date}
        event["reminders"] = {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": ALLDAY_TASK_REMINDER_MINUTES},
            ],
        }

    return event


def _build_exam_event_body(exam_data: dict) -> dict:
    """Build a Google Calendar event body from a Jot exam dict."""
    subject = exam_data.get("subject", "Untitled Exam")
    exam_date = str(exam_data.get("exam_date", ""))
    exam_type = exam_data.get("exam_type", "Exam")
    study_set_name = exam_data.get("study_set_name", "")

    description_parts = [
        f"Exam Type: {exam_type}",
    ]
    if study_set_name:
        description_parts.append(f"Study Set: {study_set_name}")
    description_parts.append("Source: Jot Study Planner")
    description = "\n".join(description_parts)

    return {
        "summary": f"Exam: {subject}",
        "description": description,
        "start": {"date": exam_date},
        "end": {"date": exam_date},
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": EXAM_REMINDER_MINUTES_DAY},
                {"method": "popup", "minutes": EXAM_REMINDER_MINUTES_HOUR},
            ],
        },
    }


# ── Public sync functions (non-blocking) ─────────────────────────────

def sync_task_to_calendar(user_id: str, task_data: dict, timezone: str = "UTC") -> None:
    """
    Create or update the Google Calendar event for a Jot task.
    Silently no-ops if the user has no active connection.
    Never raises — logs errors internally.
    """
    try:
        service = _get_calendar_service(user_id)
        if not service:
            return

        from backend.database import google_calendar_repository

        task_id = str(task_data.get("id", ""))
        if not task_id:
            return

        event_body = _build_task_event_body(task_data, timezone)
        existing = google_calendar_repository.get_event_mapping(user_id, "task", task_id)

        if existing:
            # Update existing event
            google_event_id = existing["google_event_id"]
            try:
                service.events().update(
                    calendarId="primary",
                    eventId=google_event_id,
                    body=event_body,
                ).execute()
            except Exception as exc:
                logger.error("Failed to update GCal event %s: %s", google_event_id, exc)
        else:
            # Create new event
            created_event = service.events().insert(
                calendarId="primary",
                body=event_body,
            ).execute()
            google_event_id = created_event.get("id", "")
            if google_event_id:
                google_calendar_repository.save_event_mapping(
                    user_id=user_id,
                    entity_type="task",
                    entity_id=task_id,
                    google_event_id=google_event_id,
                )
    except Exception as exc:
        logger.error("sync_task_to_calendar failed for user %s: %s", user_id, exc)


def sync_exam_to_calendar(user_id: str, exam_data: dict) -> None:
    """
    Create or update the Google Calendar event for a Jot exam.
    Silently no-ops if the user has no active connection.
    Never raises — logs errors internally.
    """
    try:
        service = _get_calendar_service(user_id)
        if not service:
            return

        from backend.database import google_calendar_repository

        exam_id = str(exam_data.get("id", ""))
        if not exam_id:
            return

        event_body = _build_exam_event_body(exam_data)
        existing = google_calendar_repository.get_event_mapping(user_id, "exam", exam_id)

        if existing:
            google_event_id = existing["google_event_id"]
            try:
                service.events().update(
                    calendarId="primary",
                    eventId=google_event_id,
                    body=event_body,
                ).execute()
            except Exception as exc:
                logger.error("Failed to update GCal exam event %s: %s", google_event_id, exc)
        else:
            created_event = service.events().insert(
                calendarId="primary",
                body=event_body,
            ).execute()
            google_event_id = created_event.get("id", "")
            if google_event_id:
                google_calendar_repository.save_event_mapping(
                    user_id=user_id,
                    entity_type="exam",
                    entity_id=exam_id,
                    google_event_id=google_event_id,
                )
    except Exception as exc:
        logger.error("sync_exam_to_calendar failed for user %s: %s", user_id, exc)


def delete_task_from_calendar(user_id: str, task_id: str) -> None:
    """
    Delete the Google Calendar event corresponding to a Jot task.
    Never raises.
    """
    try:
        from backend.database import google_calendar_repository

        mapping = google_calendar_repository.get_event_mapping(user_id, "task", task_id)
        if not mapping:
            return

        service = _get_calendar_service(user_id)
        if service:
            try:
                service.events().delete(
                    calendarId="primary",
                    eventId=mapping["google_event_id"],
                ).execute()
            except Exception as exc:
                logger.error("Failed to delete GCal task event: %s", exc)

        google_calendar_repository.delete_event_mapping(user_id, "task", task_id)
    except Exception as exc:
        logger.error("delete_task_from_calendar failed: %s", exc)


def delete_exam_from_calendar(user_id: str, exam_id: str) -> None:
    """
    Delete the Google Calendar event corresponding to a Jot exam.
    Never raises.
    """
    try:
        from backend.database import google_calendar_repository

        mapping = google_calendar_repository.get_event_mapping(user_id, "exam", exam_id)
        if not mapping:
            return

        service = _get_calendar_service(user_id)
        if service:
            try:
                service.events().delete(
                    calendarId="primary",
                    eventId=mapping["google_event_id"],
                ).execute()
            except Exception as exc:
                logger.error("Failed to delete GCal exam event: %s", exc)

        google_calendar_repository.delete_event_mapping(user_id, "exam", exam_id)
    except Exception as exc:
        logger.error("delete_exam_from_calendar failed: %s", exc)


# ── Initial synchronisation ──────────────────────────────────────────

def initial_sync(user_id: str) -> None:
    """
    Synchronise all existing Jot tasks and exams to Google Calendar.
    Called after a successful OAuth connection.

    Idempotent: if an event mapping already exists for a task/exam,
    the existing event is updated rather than duplicated.
    """
    try:
        from backend.database import task_repository, exam_repository

        # Sync tasks
        try:
            tasks = task_repository.get_tasks(user_id=user_id)
            for task in tasks:
                sync_task_to_calendar(user_id, task)
        except Exception as exc:
            logger.error("Initial task sync failed: %s", exc)

        # Sync exams (only upcoming — get_exams auto-prunes past ones)
        try:
            exams = exam_repository.get_exams(user_id=user_id)
            for exam in exams:
                sync_exam_to_calendar(user_id, exam)
        except Exception as exc:
            logger.error("Initial exam sync failed: %s", exc)

    except Exception as exc:
        logger.error("initial_sync failed for user %s: %s", user_id, exc)
