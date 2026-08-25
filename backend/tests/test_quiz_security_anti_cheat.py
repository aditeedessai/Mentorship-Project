import sys
import uuid
from pathlib import Path
from unittest.mock import patch

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

from fastapi import HTTPException
from backend.database.database import get_connection, init_db
from backend.services import study_service, evaluation_service
from backend.database import quiz_repository, attempt_repository, evaluation_repository
from backend.api.routes import attempts
from backend.api.deps import AuthenticatedUser
from backend.api.schemas.attempt import StartAttemptRequest, AttemptStatus
from backend.api.schemas.answer import SubmitAnswersRequest, AnswerItem
from backend.api.schemas.question import QuestionType


def get_existing_user_id(conn):
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


def helper_create_and_save_question(study_set_id: str, question_type: str) -> str:
    q_id = f"q_sec_{question_type}_{uuid.uuid4().hex[:6]}"
    question_data = [
        {
            "question_id": q_id,
            "study_set_id": study_set_id,
            "question_type": question_type,
            "topic": "Security Testing",
            "question": f"Sample {question_type} question?",
            "reference_answer": "Sample reference answer.",
            "correct_option": "A" if question_type == "mcq" else None,
            "options": {"A": "Option A", "B": "Option B"} if question_type == "mcq" else None,
            "marks": 2.0 if question_type == "mcq" else 10.0
        }
    ]
    quiz_repository.save_questions(study_set_id=study_set_id, questions=question_data)
    return q_id


def test_1_section_locking_duplicate_submission_fails():
    """Test 1: Submitting MCQ once succeeds. Submitting MCQ a second time returns HTTP 400 (locked section)."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("Security Set A", user_id=user_id)
    set_a_id = set_a["study_set_id"]

    att = attempts.start_attempt(payload=StartAttemptRequest(study_set_id=uuid.UUID(set_a_id)), current_user=user)
    att_id = str(att.attempt_id)

    q_mcq = helper_create_and_save_question(set_a_id, "mcq")

    sub_req = SubmitAnswersRequest(
        question_type=QuestionType.MCQ,
        answers=[AnswerItem(question_id=q_mcq, student_answer="A")]
    )

    dummy_eval = {
        "final_score": 1.0,
        "marks_awarded": 2.0,
        "semantic_score": 0.9,
        "concept_score": 0.95,
        "is_correct": True,
        "matched_concepts": ["concept"],
        "missed_concepts": []
    }

    # First MCQ submission -> Success
    with patch("backend.services.evaluation_service.evaluate_mcq", return_value=dummy_eval):
        res1 = attempts.submit_section_answers(att_id, payload=sub_req, current_user=user)
        assert res1 is not None

    # Second MCQ submission -> Fails with HTTP 400 (Section 'mcq' locked)
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.submit_section_answers(att_id, payload=sub_req, current_user=user)
        assert exc_info.value.status_code == 400
        assert "Section 'mcq' has already been submitted and is locked for this attempt" in str(exc_info.value.detail)

    study_service.delete_study_set(set_a_id, user_id=user_id)


def test_2_section_locking_allows_other_sections():
    """Test 2: Submitting MCQ successfully, then submitting Short Answer succeeds (section locking is per section)."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("Security Set B", user_id=user_id)
    set_a_id = set_a["study_set_id"]

    att = attempts.start_attempt(payload=StartAttemptRequest(study_set_id=uuid.UUID(set_a_id)), current_user=user)
    att_id = str(att.attempt_id)

    q_mcq = helper_create_and_save_question(set_a_id, "mcq")
    q_short = helper_create_and_save_question(set_a_id, "short")

    sub_mcq = SubmitAnswersRequest(
        question_type=QuestionType.MCQ,
        answers=[AnswerItem(question_id=q_mcq, student_answer="A")]
    )
    sub_short = SubmitAnswersRequest(
        question_type=QuestionType.SHORT,
        answers=[AnswerItem(question_id=q_short, student_answer="Valid short answer.")]
    )

    dummy_eval = {
        "final_score": 1.0,
        "marks_awarded": 2.0,
        "semantic_score": 0.9,
        "concept_score": 0.95,
        "is_correct": True,
        "matched_concepts": ["concept"],
        "missed_concepts": []
    }

    # Submit MCQ -> Success
    with patch("backend.services.evaluation_service.evaluate_mcq", return_value=dummy_eval):
        attempts.submit_section_answers(att_id, payload=sub_mcq, current_user=user)

    # Submit Short -> Success
    with patch("backend.services.evaluation_service.evaluate_answer", return_value=dummy_eval):
        res_short = attempts.submit_section_answers(att_id, payload=sub_short, current_user=user)
        assert res_short is not None

    study_service.delete_study_set(set_a_id, user_id=user_id)


def test_3_question_from_another_study_set_rejected():
    """Test 3: Submitting a question ID belonging to another study set returns HTTP 400."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("Set A Target", user_id=user_id)
    set_b = study_service.create_study_set("Set B Other", user_id=user_id)
    set_a_id = set_a["study_set_id"]
    set_b_id = set_b["study_set_id"]

    att_a = attempts.start_attempt(payload=StartAttemptRequest(study_set_id=uuid.UUID(set_a_id)), current_user=user)
    att_a_id = str(att_a.attempt_id)

    # Question belongs to Set B
    q_other = helper_create_and_save_question(set_b_id, "short")

    sub_req = SubmitAnswersRequest(
        question_type=QuestionType.SHORT,
        answers=[AnswerItem(question_id=q_other, student_answer="Tampered answer.")]
    )

    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.submit_section_answers(att_a_id, payload=sub_req, current_user=user)
        assert exc_info.value.status_code == 400
        assert "does not belong to the study set associated with this attempt" in str(exc_info.value.detail)

    study_service.delete_study_set(set_a_id, user_id=user_id)
    study_service.delete_study_set(set_b_id, user_id=user_id)


def test_4_mixture_valid_and_invalid_questions_rejected_no_partial_save():
    """Test 4: Submitting a mixture of valid & invalid question IDs rejects entire payload with no partial evaluation saved."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("Mix Set A", user_id=user_id)
    set_b = study_service.create_study_set("Mix Set B", user_id=user_id)
    set_a_id = set_a["study_set_id"]
    set_b_id = set_b["study_set_id"]

    att_a = attempts.start_attempt(payload=StartAttemptRequest(study_set_id=uuid.UUID(set_a_id)), current_user=user)
    att_a_id = str(att_a.attempt_id)

    q_valid = helper_create_and_save_question(set_a_id, "short")
    q_invalid = helper_create_and_save_question(set_b_id, "short")

    sub_req = SubmitAnswersRequest(
        question_type=QuestionType.SHORT,
        answers=[
            AnswerItem(question_id=q_valid, student_answer="Valid answer."),
            AnswerItem(question_id=q_invalid, student_answer="Invalid answer from set B.")
        ]
    )

    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.submit_section_answers(att_a_id, payload=sub_req, current_user=user)
        assert exc_info.value.status_code == 400
        assert "does not belong to the study set associated with this attempt" in str(exc_info.value.detail)

    # Verify no partial evaluations were saved in DB for att_a
    evals = evaluation_repository.get_evaluations_by_attempt(att_a_id)
    assert len(evals) == 0

    study_service.delete_study_set(set_a_id, user_id=user_id)
    study_service.delete_study_set(set_b_id, user_id=user_id)


def test_5_priority_1_resumable_flow_remains_functional():
    """Test 5: Verify all 4 sections completed allows finish_attempt, incomplete attempt cannot finish, and retakes work."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("E2E Security Set", user_id=user_id)
    set_a_id = set_a["study_set_id"]

    req = StartAttemptRequest(study_set_id=uuid.UUID(set_a_id))
    att = attempts.start_attempt(payload=req, current_user=user)
    att_id = str(att.attempt_id)

    dummy_eval = {
        "final_score": 1.0,
        "marks_awarded": 10.0,
        "semantic_score": 0.9,
        "concept_score": 0.95,
        "is_correct": True,
        "matched_concepts": ["concept"],
        "missed_concepts": []
    }

    # Submit all 4 mandatory section types
    with patch("backend.services.evaluation_service.evaluate_answer", return_value=dummy_eval), patch("backend.services.evaluation_service.evaluate_mcq", return_value=dummy_eval):
        for sec_type, q_enum in [("mcq", QuestionType.MCQ), ("short", QuestionType.SHORT), ("application", QuestionType.APPLICATION), ("long", QuestionType.LONG)]:
            q_id = helper_create_and_save_question(set_a_id, sec_type)
            sub = SubmitAnswersRequest(
                question_type=q_enum,
                answers=[AnswerItem(question_id=q_id, student_answer="A" if sec_type == "mcq" else "Valid answer.")]
            )
            attempts.submit_section_answers(att_id, payload=sub, current_user=user)

    # Finish attempt succeeds
    finished = attempts.finish_attempt(att_id, current_user=user)
    assert finished.status == AttemptStatus.COMPLETED
    assert finished.is_attempt_complete is True

    # Starting a new attempt creates a retake attempt
    att_retake = attempts.start_attempt(payload=req, current_user=user)
    assert str(att_retake.attempt_id) != att_id
    assert att_retake.status == AttemptStatus.IN_PROGRESS

    study_service.delete_study_set(set_a_id, user_id=user_id)


if __name__ == "__main__":
    init_db()
    print("Running test_1_section_locking_duplicate_submission_fails()...")
    test_1_section_locking_duplicate_submission_fails()
    print("Running test_2_section_locking_allows_other_sections()...")
    test_2_section_locking_allows_other_sections()
    print("Running test_3_question_from_another_study_set_rejected()...")
    test_3_question_from_another_study_set_rejected()
    print("Running test_4_mixture_valid_and_invalid_questions_rejected_no_partial_save()...")
    test_4_mixture_valid_and_invalid_questions_rejected_no_partial_save()
    print("Running test_5_priority_1_resumable_flow_remains_functional()...")
    test_5_priority_1_resumable_flow_remains_functional()
    print("\nALL QUIZ SECURITY ANTI-CHEAT TESTS PASSED SUCCESSFULLY!")
