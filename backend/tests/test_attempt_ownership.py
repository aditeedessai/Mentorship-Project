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
from backend.database import attempt_repository
from backend.api.routes import attempts, performance
from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.attempt import AttemptResponse, StartAttemptRequest
from backend.api.schemas.answer import EvaluationListResponse, SubmitAnswersRequest, AnswerItem
from backend.api.schemas.question import QuestionType


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


def test_attempt_creation_ownership():
    """Requirement 1 & 2: User A can create attempt for User A's set, but User A cannot for User B's set."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()

    user_b_id = str(uuid.uuid4())
    user_a = AuthenticatedUser(user_id=user_a_id)
    user_b = AuthenticatedUser(user_id=user_b_id)

    # Create Study Set for User A
    set_a = study_service.create_study_set("User A Attempt Set", user_id=user_a_id)
    study_set_id_a = set_a["study_set_id"]

    req = StartAttemptRequest(study_set_id=uuid.UUID(study_set_id_a))

    # User A can create attempt for User A's set
    att_resp_a = attempts.start_attempt(payload=req, current_user=user_a)
    assert isinstance(att_resp_a, AttemptResponse)
    assert str(att_resp_a.study_set_id) == study_set_id_a

    # User B CANNOT create attempt for User A's set (returns 404)
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.start_attempt(payload=req, current_user=user_b)
        assert exc_info.value.status_code == 404
    else:
        try:
            attempts.start_attempt(payload=req, current_user=user_b)
            assert False, "Should have raised 404"
        except HTTPException as e:
            assert e.status_code == 404

    # Cleanup
    study_service.delete_study_set(study_set_id_a, user_id=user_a_id)


def test_attempt_retrieval_answer_finish_results_ownership():
    """Requirements 3-14: Ownership enforcement across get, submit answers, finish, evaluations, performance, results."""
    conn = get_connection()
    user_a_id = get_existing_user_id(conn)
    conn.close()

    user_b_id = str(uuid.uuid4())
    user_a = AuthenticatedUser(user_id=user_a_id)
    user_b = AuthenticatedUser(user_id=user_b_id)

    # Create Study Set for User A
    set_a = study_service.create_study_set("User A Full Attempt Flow Set", user_id=user_a_id)
    study_set_id_a = set_a["study_set_id"]

    # Start attempt as User A
    start_req = StartAttemptRequest(study_set_id=uuid.UUID(study_set_id_a))
    att_a = attempts.start_attempt(payload=start_req, current_user=user_a)
    attempt_id_a = str(att_a.attempt_id)

    # 3 & 4. Get attempt: User A can get attempt, User B receives 404
    got_a = attempts.get_attempt(attempt_id_a, current_user=user_a)
    assert got_a.attempt_id == att_a.attempt_id

    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.get_attempt(attempt_id_a, current_user=user_b)
        assert exc_info.value.status_code == 404
    else:
        try:
            attempts.get_attempt(attempt_id_a, current_user=user_b)
            assert False, "Should have raised 404"
        except HTTPException as e:
            assert e.status_code == 404

    # 5 & 6. Submit answers: User A can submit, User B receives 404 before evaluation
    sub_req = SubmitAnswersRequest(question_type=QuestionType.MCQ, answers=[AnswerItem(question_id="q1", student_answer="A")])
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.submit_section_answers(attempt_id_a, payload=sub_req, current_user=user_b)
        assert exc_info.value.status_code == 404
    else:
        try:
            attempts.submit_section_answers(attempt_id_a, payload=sub_req, current_user=user_b)
            assert False, "Should have raised 404"
        except HTTPException as e:
            assert e.status_code == 404

    with patch("backend.api.routes.attempts.evaluate_and_save_attempt_answers") as mock_eval:
        mock_eval.return_value = {
            "attempt_id": attempt_id_a,
            "total_marks": 2.0,
            "earned_marks": 2.0,
            "percentage": 100.0,
            "results": [
                {
                    "question_id": "q1",
                    "student_answer": "A",
                    "marks_awarded": 2.0,
                    "final_score": 1.0,
                    "is_correct": True
                }
            ]
        }
        res_sub = attempts.submit_section_answers(attempt_id_a, payload=sub_req, current_user=user_a)
        assert isinstance(res_sub, EvaluationListResponse)
        assert res_sub.earned_marks == 2.0

    # 7 & 8. Finish attempt: User B receives 404, User A can finish
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.finish_attempt(attempt_id_a, current_user=user_b)
        assert exc_info.value.status_code == 404
    else:
        try:
            attempts.finish_attempt(attempt_id_a, current_user=user_b)
            assert False, "Should have raised 404"
        except HTTPException as e:
            assert e.status_code == 404

    finished_a = attempts.finish_attempt(attempt_id_a, current_user=user_a)
    assert finished_a.status.value == "completed"

    # 9, 10, 11, 12, 13, 14. Performance, Results, & Evaluations: User A can access, User B receives 404
    perf_a = performance.get_current_performance(attempt_id_a, current_user=user_a)
    assert perf_a is not None

    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            performance.get_current_performance(attempt_id_a, current_user=user_b)
        assert exc_info.value.status_code == 404

        with pytest.raises(HTTPException) as exc_info:
            performance.get_attempt_results(attempt_id_a, current_user=user_b)
        assert exc_info.value.status_code == 404

        with pytest.raises(HTTPException) as exc_info:
            attempts.get_attempt_evaluations(attempt_id_a, current_user=user_b)
        assert exc_info.value.status_code == 404
    else:
        try:
            performance.get_attempt_results(attempt_id_a, current_user=user_b)
            assert False, "Should have raised 404"
        except HTTPException as e:
            assert e.status_code == 404

    # Cleanup
    study_service.delete_study_set(study_set_id_a, user_id=user_a_id)


def test_nonexistent_and_deleted_study_set_attempt():
    """Requirement 18: Nonexistent attempt and attempt with deleted Study Set (study_set_id=NULL) return 404."""
    nonexistent_att_id = str(uuid.uuid4())
    fake_user_id = str(uuid.uuid4())
    user_obj = AuthenticatedUser(user_id=fake_user_id)

    # Nonexistent attempt ID returns 404
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.get_attempt(nonexistent_att_id, current_user=user_obj)
        assert exc_info.value.status_code == 404

    # Save attempt with NULL study_set_id
    orphan_att_id = f"orphan_{uuid.uuid4().hex[:6]}"
    attempt_repository.save_attempt(attempt_id=orphan_att_id, total_marks=0.0, marks_awarded=0.0, study_set_id=None)

    # Fetching orphan attempt with user_id returns 404 safely
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.get_attempt(orphan_att_id, current_user=user_obj)
        assert exc_info.value.status_code == 404
    else:
        try:
            attempts.get_attempt(orphan_att_id, current_user=user_obj)
            assert False, "Should have raised 404"
        except HTTPException as e:
            assert e.status_code == 404


def test_missing_and_invalid_token_attempt_auth():
    """Requirement 15 & 16: Missing or invalid token returns 401 Unauthorized via get_current_user."""
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
    print("Running test_attempt_creation_ownership()...")
    test_attempt_creation_ownership()
    print("Running test_attempt_retrieval_answer_finish_results_ownership()...")
    test_attempt_retrieval_answer_finish_results_ownership()
    print("Running test_nonexistent_and_deleted_study_set_attempt()...")
    test_nonexistent_and_deleted_study_set_attempt()
    print("Running test_missing_and_invalid_token_attempt_auth()...")
    test_missing_and_invalid_token_attempt_auth()
    print("\nALL ATTEMPT OWNERSHIP TESTS PASSED SUCCESSFULLY!")
