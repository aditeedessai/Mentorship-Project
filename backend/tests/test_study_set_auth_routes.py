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

from backend.database.database import get_connection, init_db
from backend.services import study_service
from backend.api.routes import study_sets
from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.study_set import CreateStudySetRequest, StudySetResponse, StudySetListResponse, DeleteStudySetResponse


def get_existing_user_id(conn):
    """Retrieve an existing user_id from study_sets table to satisfy foreign key constraints if needed."""
    try:
        row = conn.execute("SELECT user_id FROM study_sets WHERE user_id IS NOT NULL LIMIT 1").fetchone()
        if row and row.get("user_id"):
            return str(row["user_id"])
    except Exception:
        pass
    return None


if pytest:
    @pytest.fixture(autouse=True)
    def setup_database():
        init_db()


def test_study_set_creation_with_auth():
    """Requirement 1, 2, & 11: Valid authenticated User A creates Study Set with User A's user_id."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()

    user_a = AuthenticatedUser(user_id=user_a_id)

    req = CreateStudySetRequest(name="Authenticated User A Study Set")

    res = study_sets.create_study_set(payload=req, current_user=user_a)
    assert isinstance(res, StudySetResponse)
    assert res.user_id == user_a_id

    # Verify in DB via study_service
    set_data = study_service.get_study_set(str(res.study_set_id), user_id=user_a_id)
    assert set_data is not None
    assert set_data["user_id"] == user_a_id

    # Cleanup
    study_service.delete_study_set(str(res.study_set_id), user_id=user_a_id)


def test_study_set_listing_and_isolation():
    """Requirements 3 & 4: User A lists User A's sets, User B cannot see User A's sets."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()

    user_b_id = str(uuid.uuid4())

    user_a = AuthenticatedUser(user_id=user_a_id)
    user_b = AuthenticatedUser(user_id=user_b_id)

    # Create set for User A
    set_a = study_service.create_study_set("User A Isolated Set", user_id=user_a_id)
    set_id_a = set_a["study_set_id"]

    # User A lists study sets -> sees set_id_a
    list_a = study_sets.list_study_sets(current_user=user_a)
    assert isinstance(list_a, StudySetListResponse)
    assert any(str(s.study_set_id) == set_id_a for s in list_a.study_sets)

    # User B lists study sets -> does NOT see set_id_a
    list_b = study_sets.list_study_sets(current_user=user_b)
    assert not any(str(s.study_set_id) == set_id_a for s in list_b.study_sets)

    # Cleanup
    study_service.delete_study_set(set_id_a, user_id=user_a_id)


def test_study_set_get_and_delete_ownership_isolation():
    """Requirements 5, 6, 7, 8: User A retrieves & deletes own set; User B receives 404."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()

    user_b_id = str(uuid.uuid4())

    user_a = AuthenticatedUser(user_id=user_a_id)
    user_b = AuthenticatedUser(user_id=user_b_id)

    # Create set for User A
    set_a = study_service.create_study_set("User A Retrieval & Delete Set", user_id=user_a_id)
    set_id_a = set_a["study_set_id"]

    # 5. User A can retrieve own study set
    got_a = study_sets.get_study_set(uuid.UUID(set_id_a), current_user=user_a)
    assert got_a.name == "User A Retrieval & Delete Set"

    # 6. User B receives 404 when retrieving User A's study set
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            study_sets.get_study_set(uuid.UUID(set_id_a), current_user=user_b)
        assert exc_info.value.status_code == 404

        # 8. User B receives 404 when attempting to delete User A's study set
        with pytest.raises(HTTPException) as exc_info:
            study_sets.delete_study_set(uuid.UUID(set_id_a), current_user=user_b)
        assert exc_info.value.status_code == 404
    else:
        try:
            study_sets.get_study_set(uuid.UUID(set_id_a), current_user=user_b)
            assert False, "Should have raised 404"
        except HTTPException as e:
            assert e.status_code == 404

        try:
            study_sets.delete_study_set(uuid.UUID(set_id_a), current_user=user_b)
            assert False, "Should have raised 404"
        except HTTPException as e:
            assert e.status_code == 404

    # 7. User A can delete own study set
    del_res = study_sets.delete_study_set(uuid.UUID(set_id_a), current_user=user_a)
    assert isinstance(del_res, DeleteStudySetResponse)
    assert str(del_res.study_set_id) == set_id_a

    # Verify deleted
    assert study_service.get_study_set(set_id_a, user_id=user_a_id) is None


def test_missing_or_invalid_auth_token_returns_401():
    """Requirements 9 & 10: Missing or invalid token returns 401 Unauthorized via get_current_user dependency."""
    mock_resp = MagicMock()
    mock_resp.status_code = 401

    with patch("backend.api.deps.get_supabase_auth_config", return_value=("https://test.supabase.co", "test_key")), \
         patch("backend.api.deps.requests.get", return_value=mock_resp):

        # Missing token
        if pytest:
            with pytest.raises(HTTPException) as exc_info:
                get_current_user(authorization=None)
            assert exc_info.value.status_code == 401

            # Invalid token
            with pytest.raises(HTTPException) as exc_info:
                get_current_user(authorization="Bearer invalid.token")
            assert exc_info.value.status_code == 401
        else:
            try:
                get_current_user(authorization=None)
                assert False, "Should have raised 401"
            except HTTPException as e:
                assert e.status_code == 401

            try:
                get_current_user(authorization="Bearer invalid.token")
                assert False, "Should have raised 401"
            except HTTPException as e:
                assert e.status_code == 401


if __name__ == "__main__":
    init_db()
    print("Running test_study_set_creation_with_auth()...")
    test_study_set_creation_with_auth()
    print("Running test_study_set_listing_and_isolation()...")
    test_study_set_listing_and_isolation()
    print("Running test_study_set_get_and_delete_ownership_isolation()...")
    test_study_set_get_and_delete_ownership_isolation()
    print("Running test_missing_or_invalid_auth_token_returns_401()...")
    test_missing_or_invalid_auth_token_returns_401()
    print("\nALL STUDY SET AUTH ROUTE TESTS PASSED SUCCESSFULLY!")
