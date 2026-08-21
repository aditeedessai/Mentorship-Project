import sys
import uuid
from pathlib import Path
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
from backend.api.schemas.study_set import DeleteStudySetResponse


from backend.api.deps import AuthenticatedUser


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


def test_user_can_delete_own_study_set():
    """Requirement 1: User A can delete User A's study set."""
    conn = get_connection()
    user_a = get_existing_user_id(conn)
    conn.close()

    # Create a study set for User A
    created = study_service.create_study_set("User A Study Set", user_id=user_a)
    study_set_id = created["study_set_id"]

    # Perform deletion
    deleted = study_service.delete_study_set(study_set_id, user_id=user_a)
    assert deleted is True

    # Verify study set no longer exists
    assert study_service.get_study_set(study_set_id, user_id=user_a) is None


def test_user_cannot_delete_other_user_study_set():
    """Requirement 2: User A cannot delete User B's study set."""
    conn = get_connection()
    user_b = get_existing_user_id(conn)
    conn.close()

    user_a_fake_uuid = str(uuid.uuid4())

    # Create study set belonging to User B
    created = study_service.create_study_set("User B Study Set", user_id=user_b)
    study_set_id = created["study_set_id"]

    try:
        # User A attempts to delete User B's study set
        deleted = study_service.delete_study_set(study_set_id, user_id=user_a_fake_uuid)
        assert deleted is False

        # Verify study set still exists for User B
        existing = study_service.get_study_set(study_set_id, user_id=user_b)
        assert existing is not None
        assert existing["study_set_id"] == study_set_id
    finally:
        # Cleanup: delete with User B's id
        study_service.delete_study_set(study_set_id, user_id=user_b)


def test_delete_nonexistent_study_set():
    """Requirement 3: Deleting a nonexistent study set returns expected error/False."""
    nonexistent_id = str(uuid.uuid4())
    fake_user_id = str(uuid.uuid4())
    user_obj = AuthenticatedUser(user_id=fake_user_id)

    # Direct service call
    deleted = study_service.delete_study_set(nonexistent_id, user_id=fake_user_id)
    assert deleted is False

    # Route endpoint call should raise HTTP 404
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            study_sets.delete_study_set(uuid.UUID(nonexistent_id), current_user=user_obj)
        assert exc_info.value.status_code == 404
    else:
        try:
            study_sets.delete_study_set(uuid.UUID(nonexistent_id), current_user=user_obj)
            assert False, "Should have raised HTTPException"
        except HTTPException as exc_info:
            assert exc_info.status_code == 404


def test_post_deletion_get_and_list():
    """Requirement 4: After successful deletion, study set is no longer returned by get/list."""
    conn = get_connection()
    user_id = get_existing_user_id(conn)
    conn.close()

    user_obj = AuthenticatedUser(user_id=user_id)

    # Create study set
    created = study_service.create_study_set("Temporary Set for Post-Delete Check", user_id=user_id)
    study_set_id = created["study_set_id"]

    # Verify present before delete
    assert study_service.get_study_set(study_set_id, user_id=user_id) is not None
    listed_before = study_service.list_study_sets(user_id=user_id)
    assert any(s["study_set_id"] == study_set_id for s in listed_before)

    # Delete via route endpoint
    resp = study_sets.delete_study_set(uuid.UUID(study_set_id), current_user=user_obj)
    assert isinstance(resp, DeleteStudySetResponse)
    assert resp.study_set_id == uuid.UUID(study_set_id)

    # Verify absent after delete via get and list
    assert study_service.get_study_set(study_set_id, user_id=user_id) is None
    listed_after = study_service.list_study_sets(user_id=user_id)
    assert not any(s["study_set_id"] == study_set_id for s in listed_after)


if __name__ == "__main__":
    init_db()
    print("Running test_user_can_delete_own_study_set()...")
    test_user_can_delete_own_study_set()
    print("Running test_user_cannot_delete_other_user_study_set()...")
    test_user_cannot_delete_other_user_study_set()
    print("Running test_delete_nonexistent_study_set()...")
    test_delete_nonexistent_study_set()
    print("Running test_post_deletion_get_and_list()...")
    test_post_deletion_get_and_list()
    print("\nALL DELETE STUDY SET TESTS PASSED SUCCESSFULLY!")
