import sys
import uuid
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi import HTTPException

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

from backend.api.deps import AuthenticatedUser, get_current_user


def test_missing_authorization_header():
    """Requirement 1: Missing Authorization header -> 401 Unauthorized."""
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization=None)
        assert exc_info.value.status_code == 401
        assert "Missing Authorization header" in exc_info.value.detail
    else:
        try:
            get_current_user(authorization=None)
            assert False, "Should have raised 401"
        except HTTPException as e:
            assert e.status_code == 401
            assert "Missing Authorization header" in e.detail


def test_incorrect_authentication_scheme():
    """Requirement 4: Incorrect authentication scheme (e.g. Basic) -> 401 Unauthorized."""
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization="Basic dXNlcjpwYXNz")
        assert exc_info.value.status_code == 401
        assert "Expected 'Bearer <access_token>'" in exc_info.value.detail
    else:
        try:
            get_current_user(authorization="Basic dXNlcjpwYXNz")
            assert False, "Should have raised 401"
        except HTTPException as e:
            assert e.status_code == 401
            assert "Expected 'Bearer <access_token>'" in e.detail


def test_empty_bearer_token():
    """Requirement 3: Empty bearer token -> 401 Unauthorized."""
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization="Bearer ")
        assert exc_info.value.status_code == 401
        assert "Empty bearer token" in exc_info.value.detail
    else:
        try:
            get_current_user(authorization="Bearer ")
            assert False, "Should have raised 401"
        except HTTPException as e:
            assert e.status_code == 401
            assert "Empty bearer token" in e.detail


def test_invalid_bearer_token():
    """Requirement 2: Invalid bearer token -> 401 Unauthorized (mocked 401 response from Supabase Auth)."""
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_resp.json.return_value = {"code": 401, "msg": "Invalid JWT"}

    with patch("backend.api.deps.get_supabase_auth_config", return_value=("https://test.supabase.co", "test_key")), \
         patch("backend.api.deps.requests.get", return_value=mock_resp):
        if pytest:
            with pytest.raises(HTTPException) as exc_info:
                get_current_user(authorization="Bearer bogus.jwt.token")
            assert exc_info.value.status_code == 401
            assert "Invalid or expired authentication token" in exc_info.value.detail
        else:
            try:
                get_current_user(authorization="Bearer bogus.jwt.token")
                assert False, "Should have raised 401"
            except HTTPException as e:
                assert e.status_code == 401
                assert "Invalid or expired authentication token" in e.detail


def test_valid_supabase_token_returns_authenticated_user():
    """Requirements 5 & 6: Valid Supabase token returns AuthenticatedUser with matching user_id UUID."""
    expected_uuid = str(uuid.uuid4())
    expected_email = "student@example.com"

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "id": expected_uuid,
        "email": expected_email,
        "role": "authenticated"
    }

    with patch("backend.api.deps.get_supabase_auth_config", return_value=("https://test.supabase.co", "test_key")), \
         patch("backend.api.deps.requests.get", return_value=mock_resp) as mock_get:
        user = get_current_user(authorization="Bearer valid.supabase.jwt.token")

        assert isinstance(user, AuthenticatedUser)
        assert user.user_id == expected_uuid
        assert user.email == expected_email

        # Verify requests.get was called with expected apikey and bearer token
        mock_get.assert_called_once()
        call_kwargs = mock_get.call_args.kwargs
        assert call_kwargs["headers"]["Authorization"] == "Bearer valid.supabase.jwt.token"
        assert "apikey" in call_kwargs["headers"]


if __name__ == "__main__":
    pytest = None  # Force try/except path when running standalone script
    print("Running test_missing_authorization_header()...")
    test_missing_authorization_header()
    print("Running test_incorrect_authentication_scheme()...")
    test_incorrect_authentication_scheme()
    print("Running test_empty_bearer_token()...")
    test_empty_bearer_token()
    print("Running test_invalid_bearer_token()...")
    test_invalid_bearer_token()
    print("Running test_valid_supabase_token_returns_authenticated_user()...")
    test_valid_supabase_token_returns_authenticated_user()
    print("\nALL AUTH DEPENDENCY TESTS PASSED SUCCESSFULLY!")
