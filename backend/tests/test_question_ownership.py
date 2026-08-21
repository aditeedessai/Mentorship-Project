import sys
import uuid
from pathlib import Path
from unittest.mock import patch
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
from backend.database import quiz_repository
from backend.api.routes import questions
from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.question import GenerateQuestionsRequest, QuestionListResponse, QuestionResponse, QuestionType


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


def test_question_generation_ownership():
    """Requirement 1 & 2: User A can generate questions for User A's Study Set, but User A cannot for User B's Study Set."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()

    user_b_id = str(uuid.uuid4())
    user_a = AuthenticatedUser(user_id=user_a_id)
    user_b = AuthenticatedUser(user_id=user_b_id)

    # Create Study Set for User A
    set_a = study_service.create_study_set("User A Question Gen Set", user_id=user_a_id)
    study_set_id_a = set_a["study_set_id"]

    req = GenerateQuestionsRequest(question_type=QuestionType.MCQ)

    # User A can generate questions for User A's Study Set (mock quiz_service.run_quiz)
    with patch("backend.services.quiz_service.run_quiz") as mock_run:
        mock_run.return_value = [
            {
                "question_id": f"q_gen_{uuid.uuid4().hex[:6]}",
                "question_type": "mcq",
                "topic": "General",
                "question": "What is Python?",
                "reference_answer": "Programming language",
                "options": {"A": "Language", "B": "Snake"},
                "correct_option": "A",
                "marks": 2.0
            }
        ]
        res_a = questions.generate_questions(uuid.UUID(study_set_id_a), payload=req, current_user=user_a)
        assert isinstance(res_a, QuestionListResponse)
        assert len(res_a.questions) == 1

    # User B CANNOT generate questions for User A's Study Set (returns 404)
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            questions.generate_questions(uuid.UUID(study_set_id_a), payload=req, current_user=user_b)
        assert exc_info.value.status_code == 404
    else:
        try:
            questions.generate_questions(uuid.UUID(study_set_id_a), payload=req, current_user=user_b)
            assert False, "Should have raised HTTPException 404"
        except HTTPException as e:
            assert e.status_code == 404

    # Cleanup
    study_service.delete_study_set(study_set_id_a, user_id=user_a_id)


def test_question_retrieval_and_list_ownership():
    """Requirement 3, 4, 5, 6: User A can retrieve/list questions from User A's set; User B receives 404."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()

    user_b_id = str(uuid.uuid4())
    user_a = AuthenticatedUser(user_id=user_a_id)
    user_b = AuthenticatedUser(user_id=user_b_id)

    # Create Study Set for User A
    set_a = study_service.create_study_set("User A Question Retrieval Set", user_id=user_a_id)
    study_set_id_a = set_a["study_set_id"]

    qid = f"q_test_{uuid.uuid4().hex[:6]}"
    mock_questions = [
        {
            "question_id": qid,
            "study_set_id": study_set_id_a,
            "question_type": "short",
            "topic": "Operating Systems",
            "question": "What is process control block?",
            "reference_answer": "Data structure in OS kernel",
            "marks": 10.0
        }
    ]
    quiz_repository.save_questions(study_set_id=study_set_id_a, questions=mock_questions)

    # User A can list questions from User A's Study Set
    list_a = questions.list_questions(uuid.UUID(study_set_id_a), current_user=user_a)
    assert isinstance(list_a, QuestionListResponse)
    assert any(q.question_id == qid for q in list_a.questions)

    # User A can get question details by question_id
    q_detail_a = questions.get_question(qid, current_user=user_a)
    assert isinstance(q_detail_a, QuestionResponse)
    assert q_detail_a.question_id == qid

    # User B CANNOT list questions from User A's Study Set (returns 404)
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            questions.list_questions(uuid.UUID(study_set_id_a), current_user=user_b)
        assert exc_info.value.status_code == 404
    else:
        try:
            questions.list_questions(uuid.UUID(study_set_id_a), current_user=user_b)
            assert False, "Should have raised HTTPException 404"
        except HTTPException as e:
            assert e.status_code == 404

    # User B CANNOT get User A's question details by question_id (returns 404)
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            questions.get_question(qid, current_user=user_b)
        assert exc_info.value.status_code == 404
    else:
        try:
            questions.get_question(qid, current_user=user_b)
            assert False, "Should have raised HTTPException 404"
        except HTTPException as e:
            assert e.status_code == 404

    # Cleanup
    study_service.delete_study_set(study_set_id_a, user_id=user_a_id)


def test_nonexistent_study_set_question_endpoints():
    """Requirement 5: Nonexistent Study Set returns 404 for question endpoints."""
    fake_set_id = uuid.uuid4()
    fake_user_id = str(uuid.uuid4())
    user_obj = AuthenticatedUser(user_id=fake_user_id)
    req = GenerateQuestionsRequest(question_type=QuestionType.MCQ)

    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            questions.generate_questions(fake_set_id, payload=req, current_user=user_obj)
        assert exc_info.value.status_code == 404

        with pytest.raises(HTTPException) as exc_info:
            questions.list_questions(fake_set_id, current_user=user_obj)
        assert exc_info.value.status_code == 404
    else:
        try:
            questions.generate_questions(fake_set_id, payload=req, current_user=user_obj)
            assert False, "Should have raised 404"
        except HTTPException as e:
            assert e.status_code == 404


def test_missing_and_invalid_token_question_auth():
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
    print("Running test_question_generation_ownership()...")
    test_question_generation_ownership()
    print("Running test_question_retrieval_and_list_ownership()...")
    test_question_retrieval_and_list_ownership()
    print("Running test_nonexistent_study_set_question_endpoints()...")
    test_nonexistent_study_set_question_endpoints()
    print("Running test_missing_and_invalid_token_question_auth()...")
    test_missing_and_invalid_token_question_auth()
    print("\nALL QUESTION OWNERSHIP TESTS PASSED SUCCESSFULLY!")
