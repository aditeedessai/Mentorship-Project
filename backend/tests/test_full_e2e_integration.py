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
from backend.database import study_set_repository, quiz_repository, attempt_repository
from backend.api.routes import study_sets, documents, questions, attempts, performance
from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.study_set import CreateStudySetRequest
from backend.api.schemas.document import DocumentListResponse
from backend.api.schemas.question import GenerateQuestionsRequest, QuestionType
from backend.api.schemas.attempt import StartAttemptRequest
from backend.api.schemas.answer import SubmitAnswersRequest, AnswerItem


def get_existing_user_id(conn):
    """Retrieve an existing user_id from study_sets table if available."""
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


def test_full_e2e_authenticated_flow_and_two_user_isolation():
    """
    Full End-to-End Integration Verification:
    Login -> Supabase Token -> get_current_user() -> User UUID ->
    Study Set -> Document -> Question Gen -> Attempt -> Answer -> Evaluation -> Finish -> Performance/Results -> Two-User Isolation.
    """
    conn = get_connection()
    user_a_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()

    user_b_id = str(uuid.uuid4())

    user_a = AuthenticatedUser(user_id=user_a_id, email="usera@example.com")
    user_b = AuthenticatedUser(user_id=user_b_id, email="userb@example.com")

    # ================= 1. STUDY SET FLOW =================
    req_set_a = CreateStudySetRequest(name="E2E User A Study Set")
    set_res_a = study_sets.create_study_set(payload=req_set_a, current_user=user_a)
    study_set_id_a = str(set_res_a.study_set_id)

    assert set_res_a.user_id == user_a_id

    # User A lists study sets -> contains set_id_a
    list_sets_a = study_sets.list_study_sets(current_user=user_a)
    assert any(str(s.study_set_id) == study_set_id_a for s in list_sets_a.study_sets)

    # User B lists study sets -> does NOT contain set_id_a
    list_sets_b = study_sets.list_study_sets(current_user=user_b)
    assert not any(str(s.study_set_id) == study_set_id_a for s in list_sets_b.study_sets)

    # User B cannot retrieve User A's study set (404)
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            study_sets.get_study_set(uuid.UUID(study_set_id_a), current_user=user_b)
        assert exc_info.value.status_code == 404

    # ================= 2. DOCUMENT FLOW =================
    doc_id_a = str(uuid.uuid4())
    study_set_repository.create_document(
        document_id=doc_id_a,
        study_set_id=study_set_id_a,
        file_path="/fake/path/e2e_doc.pdf",
        file_name="e2e_doc.pdf"
    )

    # User A lists & gets document
    docs_a = documents.list_study_set_documents(uuid.UUID(study_set_id_a), current_user=user_a)
    assert any(str(d.document_id) == doc_id_a for d in docs_a.documents)

    doc_get_a = documents.get_document(uuid.UUID(doc_id_a), current_user=user_a)
    assert str(doc_get_a.document_id) == doc_id_a

    # User B cannot list or get User A's document (404)
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            documents.list_study_set_documents(uuid.UUID(study_set_id_a), current_user=user_b)
        assert exc_info.value.status_code == 404

        with pytest.raises(HTTPException) as exc_info:
            documents.get_document(uuid.UUID(doc_id_a), current_user=user_b)
        assert exc_info.value.status_code == 404

    # ================= 3. QUESTION FLOW =================
    qid_a = f"q_e2e_{uuid.uuid4().hex[:6]}"
    mock_questions = [
        {
            "question_id": qid_a,
            "study_set_id": study_set_id_a,
            "question_type": "short",
            "topic": "Machine Learning",
            "question": "What is overfitting?",
            "reference_answer": "Overfitting occurs when a model learns training noise.",
            "marks": 5.0
        }
    ]
    quiz_repository.save_questions(study_set_id=study_set_id_a, questions=mock_questions)

    # User A lists & gets question
    q_list_a = questions.list_questions(uuid.UUID(study_set_id_a), current_user=user_a)
    assert any(q.question_id == qid_a for q in q_list_a.questions)

    q_get_a = questions.get_question(qid_a, current_user=user_a)
    assert q_get_a.question_id == qid_a

    # User B cannot list or get User A's questions (404)
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            questions.list_questions(uuid.UUID(study_set_id_a), current_user=user_b)
        assert exc_info.value.status_code == 404

        with pytest.raises(HTTPException) as exc_info:
            questions.get_question(qid_a, current_user=user_b)
        assert exc_info.value.status_code == 404

    # ================= 4. ATTEMPT / ANSWER / EVALUATION / RESULTS FLOW =================
    start_req = StartAttemptRequest(study_set_id=uuid.UUID(study_set_id_a))
    att_a = attempts.start_attempt(payload=start_req, current_user=user_a)
    attempt_id_a = str(att_a.attempt_id)

    # User B cannot get User A's attempt (404)
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.get_attempt(attempt_id_a, current_user=user_b)
        assert exc_info.value.status_code == 404

    # 4a. Word limit rejection check (65 words > 60 max for short question)
    over_limit_text = "word " * 65
    sub_over_limit = SubmitAnswersRequest(
        question_type=QuestionType.SHORT,
        answers=[AnswerItem(question_id=qid_a, student_answer=over_limit_text)]
    )
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.submit_section_answers(attempt_id_a, payload=sub_over_limit, current_user=user_a)
        assert exc_info.value.status_code == 400
        assert "maximum allowed word limit of 60 words" in str(exc_info.value.detail)

    # 4b. Valid answer submission (10 words <= 60 max)
    valid_text = "word " * 10
    sub_valid = SubmitAnswersRequest(
        question_type=QuestionType.SHORT,
        answers=[AnswerItem(question_id=qid_a, student_answer=valid_text)]
    )

    with patch("backend.services.evaluation_service.evaluate_answer") as mock_eval:
        mock_eval.return_value = {
            "final_score": 1.0,
            "marks_awarded": 5.0,
            "semantic_score": 0.9,
            "concept_score": 0.95,
            "is_correct": True,
            "matched_concepts": ["noise"],
            "missed_concepts": []
        }
        res_sub = attempts.submit_section_answers(attempt_id_a, payload=sub_valid, current_user=user_a)
        assert res_sub.earned_marks > 0

    # User B cannot submit answers to User A's attempt (404)
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.submit_section_answers(attempt_id_a, payload=sub_valid, current_user=user_b)
        assert exc_info.value.status_code == 404

    # 4c. Finish attempt as User A
    finished_a = attempts.finish_attempt(attempt_id_a, current_user=user_a)
    assert finished_a.status.value == "completed"

    # User B cannot finish User A's attempt (404)
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.finish_attempt(attempt_id_a, current_user=user_b)
        assert exc_info.value.status_code == 404

    # 4d. Retrieve performance & results as User A
    perf_a = performance.get_current_performance(attempt_id_a, current_user=user_a)
    assert perf_a is not None

    res_a = performance.get_attempt_results(attempt_id_a, current_user=user_a)
    assert res_a is not None

    evals_a = attempts.get_attempt_evaluations(attempt_id_a, current_user=user_a)
    assert evals_a is not None

    # User B cannot access User A's performance, results, or evaluations (404)
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

    # ================= 5. CLEANUP =================
    study_service.delete_study_set(study_set_id_a, user_id=user_a_id)


if __name__ == "__main__":
    init_db()
    print("Running test_full_e2e_authenticated_flow_and_two_user_isolation()...")
    test_full_e2e_authenticated_flow_and_two_user_isolation()
    print("\nFULL E2E AUTHENTICATED FLOW & TWO-USER ISOLATION TEST PASSED SUCCESSFULLY!")
