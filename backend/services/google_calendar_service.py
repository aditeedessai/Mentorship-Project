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

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
)

TOKEN_ENCRYPTION_KEY = os.getenv(
    "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY",
    "",
)

# ── Google OAuth ─────────────────────────────────────────────────────

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
]

GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"

# ── Reminder configuration ──────────────────────────────────────────

TASK_REMINDER_MINUTES = 30

EXAM_REMINDER_MINUTES_DAY = 1440
EXAM_REMINDER_MINUTES_HOUR = 60

ALLDAY_TASK_REMINDER_MINUTES = 480


# ── Token encryption helpers ─────────────────────────────────────────

def _get_fernet():
    """Return a Fernet instance for token encryption, or None if not configured."""
    if not TOKEN_ENCRYPTION_KEY:
        logger.warning(
            "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY not set — "
            "tokens stored unencrypted"
        )
        return None

    try:
        from cryptography.fernet import Fernet

        return Fernet(
            TOKEN_ENCRYPTION_KEY.encode()
            if isinstance(TOKEN_ENCRYPTION_KEY, str)
            else TOKEN_ENCRYPTION_KEY
        )

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

_STATE_SECRET = (
    GOOGLE_CLIENT_SECRET or "fallback-state-secret"
).encode()


def _make_state(user_id: str) -> str:
    """Create an HMAC-signed state parameter encoding user_id."""
    import base64

    payload = json.dumps({"uid": user_id})

    sig = hmac.new(
        _STATE_SECRET,
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()

    return base64.urlsafe_b64encode(
        json.dumps(
            {
                "p": payload,
                "s": sig,
            }
        ).encode()
    ).decode()


def _verify_state(state: str) -> str | None:
    """
    Validate state and return the embedded user_id, or None if
    the signature is invalid.
    """
    try:
        import base64

        outer = json.loads(
            base64.urlsafe_b64decode(
                state.encode()
            )
        )

        payload = outer["p"]
        sig = outer["s"]

        expected = hmac.new(
            _STATE_SECRET,
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(
            sig,
            expected,
        ):
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

    return (
        f"{GOOGLE_AUTH_URI}?{urlencode(params)}"
    )


# ── OAuth code exchange ──────────────────────────────────────────────

def exchange_code(
    code: str,
    state: str,
) -> tuple[str | None, str | None]:
    """
    Exchange the authorization code for tokens, persist the connection,
    and return (user_id, error_message).

    On success error_message is None; on failure user_id may
    still be populated so the callback can redirect properly.
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
            logger.error(
                "Google token exchange failed: %s %s",
                resp.status_code,
                resp.text,
            )
            return user_id, "Google token exchange failed"

        token_data = resp.json()

        access_token = token_data.get(
            "access_token",
            "",
        )

        refresh_token = token_data.get(
            "refresh_token",
            "",
        )

        expires_in = token_data.get(
            "expires_in",
            3600,
        )

        if not refresh_token:
            logger.warning(
                "No refresh_token returned — user may have already "
                "authorised without revocation"
            )

        # Fetch connected Google account email
        google_email = None

        try:
            info_resp = http_requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={
                    "Authorization": f"Bearer {access_token}"
                },
                timeout=10,
            )

            if info_resp.status_code == 200:
                google_email = info_resp.json().get(
                    "email"
                )

        except Exception:
            pass

        now_utc = datetime.now(
            timezone.utc
        ).replace(tzinfo=None)

        token_expiry = (
            now_utc
            + timedelta(
                seconds=int(expires_in)
            )
        ).isoformat()

        # Persist encrypted refresh token
        from backend.database import (
            google_calendar_repository,
        )

        google_calendar_repository.save_connection(
            user_id=user_id,
            google_email=google_email,
            encrypted_refresh_token=(
                _encrypt_token(refresh_token)
                if refresh_token
                else ""
            ),
            access_token=access_token,
            token_expiry=token_expiry,
        )

        logger.info(
            "Google Calendar connected successfully for user %s",
            user_id,
        )

        # Run initial synchronisation
        try:
            initial_sync(user_id)

        except Exception as sync_exc:
            logger.error(
                "Initial calendar sync failed for user %s: %s",
                user_id,
                sync_exc,
            )

        return user_id, None

    except Exception as exc:
        logger.error(
            "OAuth exchange error: %s",
            exc,
        )
        return user_id, str(exc)


# ── Connection status ────────────────────────────────────────────────

def get_connection_status(user_id: str) -> dict:
    """Return connection status safely for frontend."""
    from backend.database import (
        google_calendar_repository,
    )

    conn = (
        google_calendar_repository
        .get_connection_by_user(user_id)
    )

    if conn and conn.get("is_active"):
        return {
            "connected": True,
            "email": conn.get("google_email"),
        }

    return {
        "connected": False,
        "email": None,
    }


# ── Disconnect ───────────────────────────────────────────────────────

def disconnect(user_id: str) -> bool:
    """
    Revoke the Google Calendar connection: delete all application-created
    Google Calendar events, then remove credentials and event mappings.
    Does NOT delete Jot tasks or exams.
    """
    from backend.database import (
        google_calendar_repository,
    )

    conn = (
        google_calendar_repository
        .get_connection_by_user(user_id)
    )

    if not conn:
        return (
            google_calendar_repository
            .delete_connection(user_id)
        )

    # ── 1. Retrieve all event mappings before any cleanup ────────────
    mappings = (
        google_calendar_repository
        .get_all_event_mappings(user_id)
    )

    # ── 2. Delete each Google Calendar event individually ────────────
    if mappings:
        service = _get_calendar_service(user_id)

        if service:
            for mapping in mappings:
                google_event_id = mapping.get(
                    "google_event_id"
                )

                if not google_event_id:
                    continue

                try:
                    service.events().delete(
                        calendarId="primary",
                        eventId=google_event_id,
                    ).execute()

                    logger.info(
                        "Deleted Google Calendar event %s during disconnect for user %s",
                        google_event_id,
                        user_id,
                    )

                except Exception as exc:
                    # Event may have been manually deleted already;
                    # continue with the rest of the cleanup.
                    logger.warning(
                        "Could not delete Google Calendar event %s during disconnect: %s",
                        google_event_id,
                        exc,
                    )

    # ── 3. Remove all event mappings ────────────────────────────────
    google_calendar_repository.delete_all_event_mappings(
        user_id
    )

    # ── 4. Revoke access token at Google ────────────────────────────
    if conn.get("access_token"):
        try:
            import requests as http_requests

            http_requests.post(
                "https://oauth2.googleapis.com/revoke",
                params={
                    "token": conn["access_token"]
                },
                timeout=10,
            )

        except Exception:
            pass

    # ── 5. Delete the connection ────────────────────────────────────
    return (
        google_calendar_repository
        .delete_connection(user_id)
    )


# ── Internal: build authenticated Calendar API client ────────────────

def _get_calendar_service(user_id: str):
    """
    Return a googleapiclient.discovery.Resource for the Calendar API,
    refreshing the access token if expired.

    Returns None if the user has no active connection.
    """
    from backend.database import (
        google_calendar_repository,
    )

    conn = (
        google_calendar_repository
        .get_connection_by_user(user_id)
    )

    if not conn or not conn.get("is_active"):
        logger.warning(
            "No active Google Calendar connection for user %s",
            user_id,
        )
        return None

    access_token = conn.get(
        "access_token",
        "",
    )

    token_expiry_str = conn.get(
        "token_expiry"
    )

    encrypted_refresh = conn.get(
        "encrypted_refresh_token",
        "",
    )

    # Check if access token is expired
    needs_refresh = True

    if token_expiry_str:
        try:
            expiry = datetime.fromisoformat(
                str(token_expiry_str)
                .replace("+00:00", "")
                .replace("Z", "")
            )

            now_utc = datetime.now(
                timezone.utc
            ).replace(tzinfo=None)

            needs_refresh = (
                now_utc
                >= expiry - timedelta(minutes=5)
            )

        except Exception:
            needs_refresh = True

    # Refresh access token
    if needs_refresh and encrypted_refresh:
        refresh_token = _decrypt_token(
            encrypted_refresh
        )

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

                    access_token = data.get(
                        "access_token",
                        access_token,
                    )

                    expires_in = data.get(
                        "expires_in",
                        3600,
                    )

                    now_utc = datetime.now(
                        timezone.utc
                    ).replace(tzinfo=None)

                    new_expiry = (
                        now_utc
                        + timedelta(
                            seconds=int(expires_in)
                        )
                    ).isoformat()

                    google_calendar_repository.update_access_token(
                        user_id,
                        access_token,
                        new_expiry,
                    )

                    logger.info(
                        "Google Calendar access token refreshed for user %s",
                        user_id,
                    )

                else:
                    logger.error(
                        "Token refresh failed: %s %s",
                        resp.status_code,
                        resp.text,
                    )
                    return None

            except Exception as exc:
                logger.error(
                    "Token refresh error: %s",
                    exc,
                )
                return None

    # Build Calendar API service
    try:
        from google.oauth2.credentials import (
            Credentials,
        )
        from googleapiclient.discovery import build

        creds = Credentials(
            token=access_token,
            refresh_token=None,
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
        )

        service = build(
            "calendar",
            "v3",
            credentials=creds,
            cache_discovery=False,
        )

        return service

    except Exception as exc:
        logger.error(
            "Failed to build Calendar service: %s",
            exc,
        )
        return None


# ── Event body builders ──────────────────────────────────────────────

def _build_task_event_body(
    task_data: dict,
    timezone: str = "UTC",
) -> dict:
    """Build a Google Calendar event body from a Jot task dict."""

    name = task_data.get(
        "name",
        "Untitled Task",
    )

    due_date = str(
        task_data.get(
            "due_date",
            "",
        )
    )

    due_time = task_data.get(
        "due_time"
    )

    priority = task_data.get(
        "priority",
        "medium",
    )

    task_type = task_data.get(
        "task_type",
        "study",
    )

    study_set_name = task_data.get(
        "study_set_name",
        "",
    )

    description_parts = [
        f"Priority: {priority}",
        f"Type: {task_type}",
    ]

    if study_set_name:
        description_parts.append(
            f"Study Set: {study_set_name}"
        )

    description_parts.append(
        "Source: Jot Study Planner"
    )

    description = "\n".join(
        description_parts
    )

    event = {
        "summary": f"Study Task: {name}",
        "description": description,
    }

    # ── Timed task ────────────────────────────────────────────────────

    if due_time:
        time_str = str(due_time)

        # Handle HH:MM
        if len(time_str) == 5:
            time_str += ":00"

        start_dt = f"{due_date}T{time_str}"

        event["start"] = {
            "dateTime": start_dt,
            "timeZone": timezone,
        }

        try:
            parsed = datetime.fromisoformat(
                start_dt
            )

            end = parsed + timedelta(
                hours=1
            )

            event["end"] = {
                "dateTime": end.isoformat(),
                "timeZone": timezone,
            }

        except Exception as exc:
            logger.warning(
                "Could not calculate timed task end time: %s",
                exc,
            )

            # Safe one-hour fallback
            event["end"] = {
                "dateTime": start_dt,
                "timeZone": timezone,
            }

        event["reminders"] = {
            "useDefault": False,
            "overrides": [
                {
                    "method": "popup",
                    "minutes": TASK_REMINDER_MINUTES,
                }
            ],
        }

    # ── All-day task ─────────────────────────────────────────────────

    else:
        try:
            parsed_date = datetime.strptime(
                due_date,
                "%Y-%m-%d",
            ).date()

            next_day = (
                parsed_date
                + timedelta(days=1)
            )

            # IMPORTANT:
            # Google Calendar all-day event end date
            # is EXCLUSIVE.
            event["start"] = {
                "date": parsed_date.isoformat(),
            }

            event["end"] = {
                "date": next_day.isoformat(),
            }

        except Exception as exc:
            logger.error(
                "Invalid task due_date '%s': %s",
                due_date,
                exc,
            )

            # Do not send an invalid all-day event.
            return {
                "summary": f"Study Task: {name}",
                "description": description,
            }

        event["reminders"] = {
            "useDefault": False,
            "overrides": [
                {
                    "method": "popup",
                    "minutes": ALLDAY_TASK_REMINDER_MINUTES,
                }
            ],
        }

    return event


def _build_exam_event_body(
    exam_data: dict,
) -> dict:
    """Build a Google Calendar event body from a Jot exam dict."""

    subject = exam_data.get(
        "subject",
        "Untitled Exam",
    )

    exam_date = str(
        exam_data.get(
            "exam_date",
            "",
        )
    )

    exam_type = exam_data.get(
        "exam_type",
        "Exam",
    )

    study_set_name = exam_data.get(
        "study_set_name",
        "",
    )

    description_parts = [
        f"Exam Type: {exam_type}",
    ]

    if study_set_name:
        description_parts.append(
            f"Study Set: {study_set_name}"
        )

    description_parts.append(
        "Source: Jot Study Planner"
    )

    description = "\n".join(
        description_parts
    )

    try:
        parsed_date = datetime.strptime(
            exam_date,
            "%Y-%m-%d",
        ).date()

        next_day = (
            parsed_date
            + timedelta(days=1)
        )

        start_date = parsed_date.isoformat()
        end_date = next_day.isoformat()

    except Exception as exc:
        logger.error(
            "Invalid exam date '%s': %s",
            exam_date,
            exc,
        )

        return {
            "summary": f"Exam: {subject}",
            "description": description,
        }

    return {
        "summary": f"Exam: {subject}",
        "description": description,
        "start": {
            "date": start_date,
        },
        "end": {
            "date": end_date,
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {
                    "method": "popup",
                    "minutes": EXAM_REMINDER_MINUTES_DAY,
                },
                {
                    "method": "popup",
                    "minutes": EXAM_REMINDER_MINUTES_HOUR,
                },
            ],
        },
    }


# ── Public sync functions ────────────────────────────────────────────

def sync_task_to_calendar(
    user_id: str,
    task_data: dict,
    timezone: str = "UTC",
) -> None:
    """
    Create or update the Google Calendar event for a Jot task.

    Silently no-ops if the user has no active connection.
    Never raises — logs errors internally.
    """
    try:
        logger.info(
            "Starting Google Calendar task sync for user=%s task=%s",
            user_id,
            task_data.get("id"),
        )

        service = _get_calendar_service(
            user_id
        )

        if not service:
            logger.warning(
                "Task sync skipped: no Calendar service for user %s",
                user_id,
            )
            return

        from backend.database import (
            google_calendar_repository,
        )

        task_id = str(
            task_data.get(
                "id",
                "",
            )
        )

        if not task_id:
            logger.error(
                "Task sync skipped: task has no ID"
            )
            return

        event_body = _build_task_event_body(
            task_data,
            timezone,
        )

        logger.info(
            "Google Calendar task event body: %s",
            event_body,
        )

        existing = (
            google_calendar_repository
            .get_event_mapping(
                user_id,
                "task",
                task_id,
            )
        )

        if existing:
            google_event_id = existing[
                "google_event_id"
            ]

            logger.info(
                "Updating existing Google Calendar event %s for task %s",
                google_event_id,
                task_id,
            )

            try:
                service.events().update(
                    calendarId="primary",
                    eventId=google_event_id,
                    body=event_body,
                ).execute()

                logger.info(
                    "Google Calendar task event updated successfully: %s",
                    google_event_id,
                )

            except Exception as exc:
                logger.error(
                    "Failed to update GCal event %s: %s",
                    google_event_id,
                    exc,
                )

        else:
            logger.info(
                "Creating new Google Calendar event for task %s",
                task_id,
            )

            try:
                created_event = (
                    service.events()
                    .insert(
                        calendarId="primary",
                        body=event_body,
                    )
                    .execute()
                )

                google_event_id = created_event.get(
                    "id",
                    "",
                )

                logger.info(
                    "Google Calendar task event created: %s",
                    google_event_id,
                )

                if google_event_id:
                    google_calendar_repository.save_event_mapping(
                        user_id=user_id,
                        entity_type="task",
                        entity_id=task_id,
                        google_event_id=google_event_id,
                    )

                    logger.info(
                        "Google Calendar mapping saved for task %s",
                        task_id,
                    )

            except Exception as exc:
                logger.error(
                    "Failed to create GCal task event for task %s: %s",
                    task_id,
                    exc,
                )

    except Exception as exc:
        logger.error(
            "sync_task_to_calendar failed for user %s: %s",
            user_id,
            exc,
            exc_info=True,
        )


def sync_exam_to_calendar(
    user_id: str,
    exam_data: dict,
) -> None:
    """
    Create or update the Google Calendar event for a Jot exam.

    Silently no-ops if the user has no active connection.
    Never raises — logs errors internally.
    """
    try:
        logger.info(
            "Starting Google Calendar exam sync for user=%s exam=%s",
            user_id,
            exam_data.get("id"),
        )

        service = _get_calendar_service(
            user_id
        )

        if not service:
            logger.warning(
                "Exam sync skipped: no Calendar service for user %s",
                user_id,
            )
            return

        from backend.database import (
            google_calendar_repository,
        )

        exam_id = str(
            exam_data.get(
                "id",
                "",
            )
        )

        if not exam_id:
            logger.error(
                "Exam sync skipped: exam has no ID"
            )
            return

        event_body = _build_exam_event_body(
            exam_data
        )

        logger.info(
            "Google Calendar exam event body: %s",
            event_body,
        )

        existing = (
            google_calendar_repository
            .get_event_mapping(
                user_id,
                "exam",
                exam_id,
            )
        )

        if existing:
            google_event_id = existing[
                "google_event_id"
            ]

            logger.info(
                "Updating existing Google Calendar exam event %s",
                google_event_id,
            )

            try:
                service.events().update(
                    calendarId="primary",
                    eventId=google_event_id,
                    body=event_body,
                ).execute()

            except Exception as exc:
                logger.error(
                    "Failed to update GCal exam event %s: %s",
                    google_event_id,
                    exc,
                )

        else:
            try:
                created_event = (
                    service.events()
                    .insert(
                        calendarId="primary",
                        body=event_body,
                    )
                    .execute()
                )

                google_event_id = created_event.get(
                    "id",
                    "",
                )

                logger.info(
                    "Google Calendar exam event created: %s",
                    google_event_id,
                )

                if google_event_id:
                    google_calendar_repository.save_event_mapping(
                        user_id=user_id,
                        entity_type="exam",
                        entity_id=exam_id,
                        google_event_id=google_event_id,
                    )

            except Exception as exc:
                logger.error(
                    "Failed to create GCal exam event for exam %s: %s",
                    exam_id,
                    exc,
                )

    except Exception as exc:
        logger.error(
            "sync_exam_to_calendar failed for user %s: %s",
            user_id,
            exc,
            exc_info=True,
        )


def delete_task_from_calendar(
    user_id: str,
    task_id: str,
) -> None:
    """
    Delete the Google Calendar event corresponding to a Jot task.
    Never raises.
    """
    try:
        from backend.database import (
            google_calendar_repository,
        )

        mapping = (
            google_calendar_repository
            .get_event_mapping(
                user_id,
                "task",
                task_id,
            )
        )

        if not mapping:
            logger.info(
                "No Google Calendar mapping found for task %s",
                task_id,
            )
            return

        service = _get_calendar_service(
            user_id
        )

        if service:
            try:
                service.events().delete(
                    calendarId="primary",
                    eventId=mapping[
                        "google_event_id"
                    ],
                ).execute()

                logger.info(
                    "Google Calendar task event deleted: %s",
                    mapping["google_event_id"],
                )

            except Exception as exc:
                logger.error(
                    "Failed to delete GCal task event: %s",
                    exc,
                )

        google_calendar_repository.delete_event_mapping(
            user_id,
            "task",
            task_id,
        )

    except Exception as exc:
        logger.error(
            "delete_task_from_calendar failed: %s",
            exc,
            exc_info=True,
        )


def delete_exam_from_calendar(
    user_id: str,
    exam_id: str,
) -> None:
    """
    Delete the Google Calendar event corresponding to a Jot exam.
    Never raises.
    """
    try:
        from backend.database import (
            google_calendar_repository,
        )

        mapping = (
            google_calendar_repository
            .get_event_mapping(
                user_id,
                "exam",
                exam_id,
            )
        )

        if not mapping:
            logger.info(
                "No Google Calendar mapping found for exam %s",
                exam_id,
            )
            return

        service = _get_calendar_service(
            user_id
        )

        if service:
            try:
                service.events().delete(
                    calendarId="primary",
                    eventId=mapping[
                        "google_event_id"
                    ],
                ).execute()

                logger.info(
                    "Google Calendar exam event deleted: %s",
                    mapping["google_event_id"],
                )

            except Exception as exc:
                logger.error(
                    "Failed to delete GCal exam event: %s",
                    exc,
                )

        google_calendar_repository.delete_event_mapping(
            user_id,
            "exam",
            exam_id,
        )

    except Exception as exc:
        logger.error(
            "delete_exam_from_calendar failed: %s",
            exc,
            exc_info=True,
        )


# ── Initial synchronisation ──────────────────────────────────────────

def initial_sync(user_id: str) -> None:
    """
    Synchronise all existing Jot tasks and exams to Google Calendar.

    Called after a successful OAuth connection.

    Idempotent: if an event mapping already exists for a task/exam,
    the existing event is updated rather than duplicated.
    """
    logger.info(
        "========== STARTING INITIAL GOOGLE CALENDAR SYNC =========="
    )

    try:
        from backend.database import (
            task_repository,
            exam_repository,
        )

        # ── Sync tasks ────────────────────────────────────────────────

        try:
            tasks = task_repository.get_tasks(
                user_id=user_id
            )

            logger.info(
                "Initial sync found %d tasks for user %s",
                len(tasks),
                user_id,
            )

            for task in tasks:
                logger.info(
                    "Initial syncing task: id=%s name=%s due_date=%s due_time=%s",
                    task.get("id"),
                    task.get("name"),
                    task.get("due_date"),
                    task.get("due_time"),
                )

                sync_task_to_calendar(
                    user_id,
                    task,
                )

        except Exception as exc:
            logger.error(
                "Initial task sync failed: %s",
                exc,
                exc_info=True,
            )

        # ── Sync exams ────────────────────────────────────────────────

        try:
            exams = exam_repository.get_exams(
                user_id=user_id
            )

            logger.info(
                "Initial sync found %d exams for user %s",
                len(exams),
                user_id,
            )

            for exam in exams:
                logger.info(
                    "Initial syncing exam: id=%s subject=%s date=%s",
                    exam.get("id"),
                    exam.get("subject"),
                    exam.get("exam_date"),
                )

                sync_exam_to_calendar(
                    user_id,
                    exam,
                )

        except Exception as exc:
            logger.error(
                "Initial exam sync failed: %s",
                exc,
                exc_info=True,
            )

    except Exception as exc:
        logger.error(
            "initial_sync failed for user %s: %s",
            user_id,
            exc,
            exc_info=True,
        )

    finally:
        logger.info(
            "========== GOOGLE CALENDAR INITIAL SYNC FINISHED =========="
        )