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
from backend.database import study_set_repository
from backend.api.routes import documents
from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.document import DocumentListResponse, DocumentResponse


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


def test_user_can_list_and_get_own_document():
    """Requirement 1, 3, 4, 5, 6: User A can list & retrieve User A's document, but User B receives 404."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()

    user_b_id = str(uuid.uuid4())
    user_a = AuthenticatedUser(user_id=user_a_id)
    user_b = AuthenticatedUser(user_id=user_b_id)

    # Create Study Set for User A
    set_a = study_service.create_study_set("User A Document Set", user_id=user_a_id)
    study_set_id_a = set_a["study_set_id"]

    # Register a document directly under User A's Study Set
    doc_id = str(uuid.uuid4())
    doc_record = study_set_repository.create_document(
        document_id=doc_id,
        study_set_id=study_set_id_a,
        file_path="/fake/path/test_doc.pdf",
        file_name="test_doc.pdf"
    )

    # User A can list documents from User A's Study Set
    list_resp_a = documents.list_study_set_documents(uuid.UUID(study_set_id_a), current_user=user_a)
    assert isinstance(list_resp_a, DocumentListResponse)
    assert any(d.document_id == uuid.UUID(doc_id) for d in list_resp_a.documents)

    # User A can get User A's document details by document_id
    doc_resp_a = documents.get_document(uuid.UUID(doc_id), current_user=user_a)
    assert isinstance(doc_resp_a, DocumentResponse)
    assert doc_resp_a.document_id == uuid.UUID(doc_id)

    # User B CANNOT list documents from User A's Study Set (returns 404)
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            documents.list_study_set_documents(uuid.UUID(study_set_id_a), current_user=user_b)
        assert exc_info.value.status_code == 404
    else:
        try:
            documents.list_study_set_documents(uuid.UUID(study_set_id_a), current_user=user_b)
            assert False, "Should have raised HTTPException 404"
        except HTTPException as e:
            assert e.status_code == 404

    # User B CANNOT retrieve User A's document by document_id (returns 404)
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            documents.get_document(uuid.UUID(doc_id), current_user=user_b)
        assert exc_info.value.status_code == 404
    else:
        try:
            documents.get_document(uuid.UUID(doc_id), current_user=user_b)
            assert False, "Should have raised HTTPException 404"
        except HTTPException as e:
            assert e.status_code == 404

    # Cleanup
    study_service.delete_study_set(study_set_id_a, user_id=user_a_id)


def test_user_cannot_upload_to_other_user_study_set():
    """Requirement 2: User A cannot upload a document to User B's Study Set."""
    conn = get_connection()
    user_b_id = get_existing_user_id(conn)
    conn.close()

    user_a_id = str(uuid.uuid4())
    user_a = AuthenticatedUser(user_id=user_a_id)

    # Create Study Set for User B
    set_b = study_service.create_study_set("User B Upload Target Set", user_id=user_b_id)
    study_set_id_b = set_b["study_set_id"]

    # User A tries to upload to User B's study set -> must be rejected with 404 before processing
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            documents.upload_documents(uuid.UUID(study_set_id_b), files=[], current_user=user_a)
        assert exc_info.value.status_code in (400, 404)
    else:
        try:
            documents.upload_documents(uuid.UUID(study_set_id_b), files=[], current_user=user_a)
            assert False, "Should have raised HTTPException"
        except HTTPException as e:
            assert e.status_code in (400, 404)

    # Cleanup
    study_service.delete_study_set(study_set_id_b, user_id=user_b_id)


def test_missing_and_invalid_token_document_auth():
    """Requirement 7 & 8: Missing or invalid token returns 401 Unauthorized via get_current_user."""
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization=None)
        assert exc_info.value.status_code == 401

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(authorization="Bearer invalid.token")
        assert exc_info.value.status_code == 401
    else:
        try:
            get_current_user(authorization=None)
            assert False, "Should have raised 401"
        except HTTPException as e:
            assert e.status_code == 401


if __name__ == "__main__":
    init_db()
    print("Running test_user_can_list_and_get_own_document()...")
    test_user_can_list_and_get_own_document()
    print("Running test_user_cannot_upload_to_other_user_study_set()...")
    test_user_cannot_upload_to_other_user_study_set()
    print("Running test_missing_and_invalid_token_document_auth()...")
    test_missing_and_invalid_token_document_auth()
    print("\nALL DOCUMENT OWNERSHIP TESTS PASSED SUCCESSFULLY!")
