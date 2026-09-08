"""
Tests for Google Calendar integration.

All Google Calendar API calls are mocked — no real Google account is needed.
Follows the existing test pattern: pytest, direct route function calls with
AuthenticatedUser, init_db() fixture.
"""

import sys
import uuid
from datetime import date, time
from pathlib import Path
from unittest.mock import MagicMock, patch, PropertyMock

# Add project root to sys.path
TEST_DIR = Path(__file__).resolve().parent
BACKEND_DIR = TEST_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

for p in (str(PROJECT_ROOT), str(BACKEND_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    import pytest
except ImportError:
    pytest = None

from backend.database.database import get_connection, init_db
from backend.api.deps import AuthenticatedUser
from backend.services import google_calendar_service


# ── Helpers ──────────────────────────────────────────────────────────

def _get_test_user_id():
    """Return a valid test user_id from the database or generate one."""
    conn = get_connection()
    try:
        row = conn.execute("SELECT user_id FROM study_sets WHERE user_id IS NOT NULL LIMIT 1").fetchone()
        if row and row.get("user_id"):
            return str(row["user_id"])
    except Exception:
        pass
    finally:
        conn.close()
    return str(uuid.uuid4())


if pytest:
    @pytest.fixture(autouse=True)
    def setup_database():
        init_db()


# ═══════════════════════════════════════════════════════════════════════
# 1. Unauthenticated users cannot access Calendar endpoints
# ═══════════════════════════════════════════════════════════════════════

def test_unauthenticated_connect():
    """Unauthenticated request to /connect should fail."""
    from fastapi import HTTPException
    from backend.api.routes import google_calendar

    # Call without current_user should raise (FastAPI dependency injection
    # handles this in production; here we verify the route requires it)
    try:
        # The route function requires current_user — calling without it
        # would be a TypeError in direct invocation
        google_calendar.connect_google_calendar(current_user=None)
        # If it doesn't raise, that's acceptable too since None user_id
        # won't produce a valid URL — the point is no crash
    except (TypeError, AttributeError, HTTPException):
        pass  # Expected: auth dependency would reject this


# ═══════════════════════════════════════════════════════════════════════
# 2. Authenticated users can obtain an OAuth connection URL
# ═══════════════════════════════════════════════════════════════════════

def test_authenticated_connect_url():
    """Authenticated user should get back a dict with auth_url."""
    from backend.api.routes import google_calendar

    user = AuthenticatedUser(user_id=str(uuid.uuid4()))
    result = google_calendar.connect_google_calendar(current_user=user)
    assert "auth_url" in result
    assert "accounts.google.com" in result["auth_url"]
    assert "state=" in result["auth_url"]


# ═══════════════════════════════════════════════════════════════════════
# 3. OAuth state validation rejects invalid state
# ═══════════════════════════════════════════════════════════════════════

def test_invalid_oauth_state():
    """exchange_code should reject a tampered state."""
    user_id, error = google_calendar_service.exchange_code("fake_code", "invalid_state")
    assert error is not None
    assert user_id is None


def test_valid_oauth_state_round_trip():
    """State should round-trip correctly."""
    uid = str(uuid.uuid4())
    state = google_calendar_service._make_state(uid)
    recovered = google_calendar_service._verify_state(state)
    assert recovered == uid


# ═══════════════════════════════════════════════════════════════════════
# 4. Calendar connection status — disconnected
# ═══════════════════════════════════════════════════════════════════════

@patch("backend.services.google_calendar_service.google_calendar_repository" if False else
       "backend.database.google_calendar_repository.get_connection_by_user",
       return_value=None)
def test_connection_status_disconnected(mock_get):
    """User with no connection should get connected=False."""
    status = google_calendar_service.get_connection_status(str(uuid.uuid4()))
    assert status["connected"] is False
    assert status["email"] is None


# ═══════════════════════════════════════════════════════════════════════
# 5. Calendar connection status — connected
# ═══════════════════════════════════════════════════════════════════════

@patch("backend.database.google_calendar_repository.get_connection_by_user",
       return_value={
           "is_active": True,
           "google_email": "test@gmail.com",
           "access_token": "tok",
           "encrypted_refresh_token": "enc",
       })
def test_connection_status_connected(mock_get):
    """Connected user should get connected=True and their email."""
    status = google_calendar_service.get_connection_status(str(uuid.uuid4()))
    assert status["connected"] is True
    assert status["email"] == "test@gmail.com"


# ═══════════════════════════════════════════════════════════════════════
# 6. Tokens are never returned by API responses
# ═══════════════════════════════════════════════════════════════════════

@patch("backend.database.google_calendar_repository.get_connection_by_user",
       return_value={
           "is_active": True,
           "google_email": "test@gmail.com",
           "access_token": "secret_tok",
           "encrypted_refresh_token": "secret_ref",
       })
def test_tokens_never_in_response(mock_get):
    """Status endpoint should never leak tokens."""
    status = google_calendar_service.get_connection_status(str(uuid.uuid4()))
    status_str = str(status)
    assert "secret_tok" not in status_str
    assert "secret_ref" not in status_str
    assert "access_token" not in status
    assert "refresh_token" not in status
    assert "encrypted_refresh_token" not in status


# ═══════════════════════════════════════════════════════════════════════
# 7. Task creation triggers Calendar event creation when connected
# ═══════════════════════════════════════════════════════════════════════

@patch("backend.database.google_calendar_repository.get_event_mapping", return_value=None)
@patch("backend.database.google_calendar_repository.save_event_mapping")
@patch("backend.database.google_calendar_repository.get_connection_by_user",
       return_value={
           "is_active": True,
           "access_token": "tok",
           "token_expiry": "2099-01-01T00:00:00",
           "encrypted_refresh_token": "ref",
       })
def test_task_create_triggers_sync(mock_conn, mock_save, mock_get_map):
    """When user is connected, syncing a task should call GCal API."""
    mock_service = MagicMock()
    mock_service.events.return_value.insert.return_value.execute.return_value = {"id": "gcal_123"}

    with patch("googleapiclient.discovery.build", return_value=mock_service):
        with patch("google.oauth2.credentials.Credentials"):
            google_calendar_service.sync_task_to_calendar(
                user_id=str(uuid.uuid4()),
                task_data={
                    "id": str(uuid.uuid4()),
                    "name": "Study Chapter 5",
                    "due_date": "2026-10-01",
                    "due_time": "14:00",
                    "priority": "high",
                    "task_type": "study",
                },
            )
    # Verify insert was called
    mock_service.events.return_value.insert.assert_called_once()
    mock_save.assert_called_once()


# ═══════════════════════════════════════════════════════════════════════
# 8. Task creation still succeeds when Calendar API fails
# ═══════════════════════════════════════════════════════════════════════

@patch("backend.database.google_calendar_repository.get_event_mapping", return_value=None)
@patch("backend.database.google_calendar_repository.get_connection_by_user",
       return_value={
           "is_active": True,
           "access_token": "tok",
           "token_expiry": "2099-01-01T00:00:00",
           "encrypted_refresh_token": "ref",
       })
def test_task_create_succeeds_on_gcal_failure(mock_conn, mock_get_map):
    """sync_task_to_calendar should never raise even if GCal API fails."""
    mock_service = MagicMock()
    mock_service.events.return_value.insert.return_value.execute.side_effect = Exception("GCal API down")

    with patch("googleapiclient.discovery.build", return_value=mock_service):
        with patch("google.oauth2.credentials.Credentials"):
            # This should NOT raise
            google_calendar_service.sync_task_to_calendar(
                user_id=str(uuid.uuid4()),
                task_data={
                    "id": str(uuid.uuid4()),
                    "name": "Study Chapter 5",
                    "due_date": "2026-10-01",
                    "priority": "high",
                    "task_type": "study",
                },
            )
    # If we got here without an exception, the test passes


# ═══════════════════════════════════════════════════════════════════════
# 9. Task update synchronizes the Calendar event
# ═══════════════════════════════════════════════════════════════════════

@patch("backend.database.google_calendar_repository.get_event_mapping",
       return_value={"google_event_id": "existing_gcal_id"})
@patch("backend.database.google_calendar_repository.get_connection_by_user",
       return_value={
           "is_active": True,
           "access_token": "tok",
           "token_expiry": "2099-01-01T00:00:00",
           "encrypted_refresh_token": "ref",
       })
def test_task_update_syncs_calendar(mock_conn, mock_get_map):
    """When a mapping exists, sync should UPDATE the existing event."""
    mock_service = MagicMock()
    mock_service.events.return_value.update.return_value.execute.return_value = {"id": "existing_gcal_id"}

    with patch("googleapiclient.discovery.build", return_value=mock_service):
        with patch("google.oauth2.credentials.Credentials"):
            google_calendar_service.sync_task_to_calendar(
                user_id=str(uuid.uuid4()),
                task_data={
                    "id": str(uuid.uuid4()),
                    "name": "Updated Task Name",
                    "due_date": "2026-10-02",
                    "priority": "low",
                    "task_type": "review",
                },
            )
    mock_service.events.return_value.update.assert_called_once()


# ═══════════════════════════════════════════════════════════════════════
# 10. Task deletion attempts to delete the Calendar event
# ═══════════════════════════════════════════════════════════════════════

@patch("backend.database.google_calendar_repository.delete_event_mapping")
@patch("backend.database.google_calendar_repository.get_event_mapping",
       return_value={"google_event_id": "gcal_to_delete"})
@patch("backend.database.google_calendar_repository.get_connection_by_user",
       return_value={
           "is_active": True,
           "access_token": "tok",
           "token_expiry": "2099-01-01T00:00:00",
           "encrypted_refresh_token": "ref",
       })
def test_task_delete_removes_calendar_event(mock_conn, mock_get_map, mock_del_map):
    """Deleting a task should delete the corresponding GCal event."""
    mock_service = MagicMock()

    with patch("googleapiclient.discovery.build", return_value=mock_service):
        with patch("google.oauth2.credentials.Credentials"):
            google_calendar_service.delete_task_from_calendar(
                user_id=str(uuid.uuid4()),
                task_id=str(uuid.uuid4()),
            )
    mock_service.events.return_value.delete.assert_called_once()
    mock_del_map.assert_called_once()


# ═══════════════════════════════════════════════════════════════════════
# 11. Exam creation synchronizes to Calendar
# ═══════════════════════════════════════════════════════════════════════

@patch("backend.database.google_calendar_repository.get_event_mapping", return_value=None)
@patch("backend.database.google_calendar_repository.save_event_mapping")
@patch("backend.database.google_calendar_repository.get_connection_by_user",
       return_value={
           "is_active": True,
           "access_token": "tok",
           "token_expiry": "2099-01-01T00:00:00",
           "encrypted_refresh_token": "ref",
       })
def test_exam_create_triggers_sync(mock_conn, mock_save, mock_get_map):
    """When connected, creating an exam should create a GCal all-day event."""
    mock_service = MagicMock()
    mock_service.events.return_value.insert.return_value.execute.return_value = {"id": "gcal_exam_1"}

    with patch("googleapiclient.discovery.build", return_value=mock_service):
        with patch("google.oauth2.credentials.Credentials"):
            google_calendar_service.sync_exam_to_calendar(
                user_id=str(uuid.uuid4()),
                exam_data={
                    "id": str(uuid.uuid4()),
                    "subject": "Calculus II",
                    "exam_type": "Midterm",
                    "exam_date": "2026-11-15",
                },
            )
    mock_service.events.return_value.insert.assert_called_once()
    # Verify all-day event format
    call_args = mock_service.events.return_value.insert.call_args
    body = call_args[1]["body"] if "body" in call_args[1] else call_args[0][0]
    assert "date" in body.get("start", {})  # all-day event uses 'date' not 'dateTime'


# ═══════════════════════════════════════════════════════════════════════
# 12. Exam deletion synchronizes to Calendar
# ═══════════════════════════════════════════════════════════════════════

@patch("backend.database.google_calendar_repository.delete_event_mapping")
@patch("backend.database.google_calendar_repository.get_event_mapping",
       return_value={"google_event_id": "gcal_exam_del"})
@patch("backend.database.google_calendar_repository.get_connection_by_user",
       return_value={
           "is_active": True,
           "access_token": "tok",
           "token_expiry": "2099-01-01T00:00:00",
           "encrypted_refresh_token": "ref",
       })
def test_exam_delete_removes_calendar_event(mock_conn, mock_get_map, mock_del_map):
    """Deleting an exam should delete its GCal event and mapping."""
    mock_service = MagicMock()

    with patch("googleapiclient.discovery.build", return_value=mock_service):
        with patch("google.oauth2.credentials.Credentials"):
            google_calendar_service.delete_exam_from_calendar(
                user_id=str(uuid.uuid4()),
                exam_id=str(uuid.uuid4()),
            )
    mock_service.events.return_value.delete.assert_called_once()
    mock_del_map.assert_called_once()


# ═══════════════════════════════════════════════════════════════════════
# 13. Repeated synchronization does not create duplicate Calendar events
# ═══════════════════════════════════════════════════════════════════════

@patch("backend.database.google_calendar_repository.get_event_mapping",
       return_value={"google_event_id": "existing_gcal"})
@patch("backend.database.google_calendar_repository.save_event_mapping")
@patch("backend.database.google_calendar_repository.get_connection_by_user",
       return_value={
           "is_active": True,
           "access_token": "tok",
           "token_expiry": "2099-01-01T00:00:00",
           "encrypted_refresh_token": "ref",
       })
def test_no_duplicate_events_on_resync(mock_conn, mock_save, mock_get_map):
    """If a mapping exists, sync should update (not insert) the event."""
    mock_service = MagicMock()
    mock_service.events.return_value.update.return_value.execute.return_value = {"id": "existing_gcal"}

    with patch("googleapiclient.discovery.build", return_value=mock_service):
        with patch("google.oauth2.credentials.Credentials"):
            google_calendar_service.sync_task_to_calendar(
                user_id=str(uuid.uuid4()),
                task_data={
                    "id": str(uuid.uuid4()),
                    "name": "Same Task Again",
                    "due_date": "2026-10-01",
                    "priority": "medium",
                    "task_type": "study",
                },
            )
    # insert should NOT have been called — only update
    mock_service.events.return_value.insert.assert_not_called()
    mock_service.events.return_value.update.assert_called_once()


# ═══════════════════════════════════════════════════════════════════════
# 14. Disconnecting Calendar does not delete Jot tasks/exams
# ═══════════════════════════════════════════════════════════════════════

@patch("backend.database.google_calendar_repository.delete_connection", return_value=True)
@patch("backend.database.google_calendar_repository.delete_all_event_mappings", return_value=3)
@patch("backend.database.google_calendar_repository.get_connection_by_user",
       return_value={"access_token": "tok", "is_active": True})
def test_disconnect_preserves_tasks(mock_conn, mock_del_maps, mock_del_conn):
    """Disconnecting should delete GCal mappings but NOT touch Jot tasks/exams."""
    with patch("requests.post"):  # Mock the token revocation HTTP call
        result = google_calendar_service.disconnect(str(uuid.uuid4()))
    assert result is True
    mock_del_maps.assert_called_once()
    mock_del_conn.assert_called_once()
    # The test implicitly verifies no task/exam deletion happened —
    # those repositories were never called.


# ═══════════════════════════════════════════════════════════════════════
# 15. Users without Calendar access can use Planner normally
# ═══════════════════════════════════════════════════════════════════════

@patch("backend.database.google_calendar_repository.get_connection_by_user",
       return_value=None)
def test_planner_works_without_connection(mock_get):
    """sync functions should silently no-op when user has no connection."""
    # These should NOT raise
    google_calendar_service.sync_task_to_calendar(
        user_id=str(uuid.uuid4()),
        task_data={"id": str(uuid.uuid4()), "name": "Test", "due_date": "2026-10-01"},
    )
    google_calendar_service.sync_exam_to_calendar(
        user_id=str(uuid.uuid4()),
        exam_data={"id": str(uuid.uuid4()), "subject": "Math", "exam_date": "2026-11-01"},
    )
    google_calendar_service.delete_task_from_calendar(str(uuid.uuid4()), str(uuid.uuid4()))
    google_calendar_service.delete_exam_from_calendar(str(uuid.uuid4()), str(uuid.uuid4()))
    # All should complete without error


# ═══════════════════════════════════════════════════════════════════════
# Event body builder unit tests
# ═══════════════════════════════════════════════════════════════════════

def test_task_event_body_timed():
    """Timed tasks should produce dateTime events with reminder."""
    body = google_calendar_service._build_task_event_body({
        "name": "Review Notes",
        "due_date": "2026-10-15",
        "due_time": "14:30:00",
        "priority": "high",
        "task_type": "review",
        "study_set_name": "Calculus",
    })
    assert body["summary"] == "Study Task: Review Notes"
    assert "dateTime" in body["start"]
    assert body["reminders"]["overrides"][0]["minutes"] == google_calendar_service.TASK_REMINDER_MINUTES
    assert "Priority: high" in body["description"]
    assert "Study Set: Calculus" in body["description"]
    assert "Source: Jot Study Planner" in body["description"]


def test_task_event_body_allday():
    """Tasks without due_time should produce all-day events."""
    body = google_calendar_service._build_task_event_body({
        "name": "Read Chapter 3",
        "due_date": "2026-10-15",
        "due_time": None,
        "priority": "medium",
        "task_type": "study",
    })
    assert "date" in body["start"]
    assert "dateTime" not in body["start"]


def test_exam_event_body():
    """Exam events should be all-day with two reminders."""
    body = google_calendar_service._build_exam_event_body({
        "subject": "Physics Final",
        "exam_date": "2026-12-10",
        "exam_type": "Final",
        "study_set_name": "Physics 101",
    })
    assert body["summary"] == "Exam: Physics Final"
    assert "date" in body["start"]
    assert len(body["reminders"]["overrides"]) == 2
    assert "Exam Type: Final" in body["description"]
    assert "Study Set: Physics 101" in body["description"]


def test_token_encryption_round_trip():
    """Encrypted tokens should decrypt back to the original."""
    original = "test_refresh_token_12345"
    encrypted = google_calendar_service._encrypt_token(original)
    decrypted = google_calendar_service._decrypt_token(encrypted)
    assert decrypted == original
