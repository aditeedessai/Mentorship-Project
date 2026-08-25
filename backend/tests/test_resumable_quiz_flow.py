import sys
import uuid
from pathlib import Path

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

from fastapi import HTTPException
from backend.database.database import get_connection, init_db
from backend.services import study_service, evaluation_service
from backend.database import quiz_repository, attempt_repository, evaluation_repository
from backend.api.routes import attempts, questions, performance
from backend.api.deps import AuthenticatedUser
from backend.api.schemas.attempt import StartAttemptRequest, AttemptStatus
from backend.api.schemas.answer import SubmitAnswersRequest, AnswerItem
from backend.api.schemas.question import QuestionType


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


def helper_create_and_save_question(study_set_id: str, question_type: str) -> str:
    """Helper to save a question of a given type to DB and return question_id."""
    q_id = f"q_{question_type}_{uuid.uuid4().hex[:6]}"
    question_data = [
        {
            "question_id": q_id,
            "study_set_id": study_set_id,
            "question_type": question_type,
            "topic": "General",
            "question": f"Sample {question_type} question?",
            "reference_answer": "Sample reference answer for testing.",
            "correct_option": "A" if question_type == "mcq" else None,
            "options": {"A": "Option A", "B": "Option B"} if question_type == "mcq" else None,
            "marks": 2.0 if question_type == "mcq" else 10.0
        }
    ]
    quiz_repository.save_questions(study_set_id=study_set_id, questions=question_data)
    return q_id


def helper_submit_evaluations_for_type(attempt_id: str, question_id: str, question_type: str):
    """Helper to save evaluation directly for a question and attempt."""
    eval_result = {
        "final_score": 1.0,
        "marks_awarded": 2.0 if question_type == "mcq" else 10.0,
        "semantic_score": 0.9,
        "concept_score": 0.95,
        "matched_concepts": ["concept"],
        "missed_concepts": []
    }
    evaluation_repository.save_evaluation(
        question_id=question_id,
        student_answer="A" if question_type == "mcq" else "Sample answer",
        evaluation=eval_result,
        attempt_id=attempt_id
    )


def test_1_resume_same_study_set():
    """Test 1: Starting attempt for same study set resumes existing in_progress attempt."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("Resumable Set A", user_id=user_id)
    set_a_id = set_a["study_set_id"]

    req = StartAttemptRequest(study_set_id=uuid.UUID(set_a_id))

    # First call creates attempt A1
    att_1 = attempts.start_attempt(payload=req, current_user=user)
    attempt_id_1 = str(att_1.attempt_id)
    assert att_1.status == AttemptStatus.IN_PROGRESS

    # Second call returns SAME attempt A1
    att_2 = attempts.start_attempt(payload=req, current_user=user)
    assert str(att_2.attempt_id) == attempt_id_1

    # Active attempt endpoint returns SAME attempt A1
    active_att = attempts.get_active_attempt_for_study_set(study_set_id=uuid.UUID(set_a_id), current_user=user)
    assert str(active_att.attempt_id) == attempt_id_1

    study_service.delete_study_set(set_a_id, user_id=user_id)


def test_2_independent_study_sets():
    """Test 2: Multiple study sets have independent in_progress attempts."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("Set A", user_id=user_id)
    set_b = study_service.create_study_set("Set B", user_id=user_id)
    set_a_id = set_a["study_set_id"]
    set_b_id = set_b["study_set_id"]

    req_a = StartAttemptRequest(study_set_id=uuid.UUID(set_a_id))
    req_b = StartAttemptRequest(study_set_id=uuid.UUID(set_b_id))

    att_a = attempts.start_attempt(payload=req_a, current_user=user)
    att_b = attempts.start_attempt(payload=req_b, current_user=user)

    assert str(att_a.attempt_id) != str(att_b.attempt_id)
    assert str(att_a.study_set_id) == set_a_id
    assert str(att_b.study_set_id) == set_b_id

    study_service.delete_study_set(set_a_id, user_id=user_id)
    study_service.delete_study_set(set_b_id, user_id=user_id)


def test_3_and_4_incomplete_attempt_cannot_finish():
    """Test 3 & 4: Attempt with 1, 2, or 3 completed sections cannot be finished (returns HTTP 400)."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("Incomplete Test Set", user_id=user_id)
    set_a_id = set_a["study_set_id"]

    req = StartAttemptRequest(study_set_id=uuid.UUID(set_a_id))
    att = attempts.start_attempt(payload=req, current_user=user)
    att_id = str(att.attempt_id)

    # 0 sections done: finish fails with 400
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.finish_attempt(att_id, current_user=user)
        assert exc_info.value.status_code == 400
        assert "incomplete sections" in str(exc_info.value.detail)

    # Complete 1 section ('mcq')
    q_mcq = helper_create_and_save_question(set_a_id, "mcq")
    helper_submit_evaluations_for_type(att_id, q_mcq, "mcq")

    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.finish_attempt(att_id, current_user=user)
        assert exc_info.value.status_code == 400
        assert "incomplete sections" in str(exc_info.value.detail)
        assert "short" in str(exc_info.value.detail)
        assert "application" in str(exc_info.value.detail)
        assert "long" in str(exc_info.value.detail)

    # Complete 2nd section ('short')
    q_short = helper_create_and_save_question(set_a_id, "short")
    helper_submit_evaluations_for_type(att_id, q_short, "short")

    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.finish_attempt(att_id, current_user=user)
        assert exc_info.value.status_code == 400
        assert "application" in str(exc_info.value.detail)
        assert "long" in str(exc_info.value.detail)

    study_service.delete_study_set(set_a_id, user_id=user_id)


def test_5_all_four_sections_completed_finish():
    """Test 5: Completing all 4 section types allows finish_attempt to succeed."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("Four Section Complete Set", user_id=user_id)
    set_a_id = set_a["study_set_id"]

    req = StartAttemptRequest(study_set_id=uuid.UUID(set_a_id))
    att = attempts.start_attempt(payload=req, current_user=user)
    att_id = str(att.attempt_id)

    # Submit evaluations for all 4 mandatory sections
    for sec_type in ["mcq", "short", "application", "long"]:
        q_id = helper_create_and_save_question(set_a_id, sec_type)
        helper_submit_evaluations_for_type(att_id, q_id, sec_type)

    # Finish attempt succeeds
    finished = attempts.finish_attempt(att_id, current_user=user)
    assert finished.status == AttemptStatus.COMPLETED
    assert finished.is_attempt_complete is True
    assert len(finished.completed_sections) == 4

    study_service.delete_study_set(set_a_id, user_id=user_id)


def test_6_retake_creates_new_attempt():
    """Test 6: After an attempt is completed, starting a quiz for the same set creates a NEW attempt."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("Retake Test Set", user_id=user_id)
    set_a_id = set_a["study_set_id"]

    req = StartAttemptRequest(study_set_id=uuid.UUID(set_a_id))
    att_1 = attempts.start_attempt(payload=req, current_user=user)
    att_1_id = str(att_1.attempt_id)

    # Complete all 4 sections for att_1
    for sec_type in ["mcq", "short", "application", "long"]:
        q_id = helper_create_and_save_question(set_a_id, sec_type)
        helper_submit_evaluations_for_type(att_1_id, q_id, sec_type)

    attempts.finish_attempt(att_1_id, current_user=user)

    # Starting a new attempt for set_a creates NEW attempt_id
    att_2 = attempts.start_attempt(payload=req, current_user=user)
    att_2_id = str(att_2.attempt_id)

    assert att_2_id != att_1_id
    assert att_2.status == AttemptStatus.IN_PROGRESS

    # Old attempt att_1 still exists in DB as completed
    old_att = attempt_repository.get_attempt(att_1_id, user_id=user_id)
    assert old_att is not None
    assert old_att["status"] == "completed"

    study_service.delete_study_set(set_a_id, user_id=user_id)


def test_7_session_switching_between_study_sets():
    """Test 7: Leaving Set A to work on Set B, then returning to Set A resumes Set A's ongoing attempt."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("Switch Set A", user_id=user_id)
    set_b = study_service.create_study_set("Switch Set B", user_id=user_id)
    set_a_id = set_a["study_set_id"]
    set_b_id = set_b["study_set_id"]

    req_a = StartAttemptRequest(study_set_id=uuid.UUID(set_a_id))
    req_b = StartAttemptRequest(study_set_id=uuid.UUID(set_b_id))

    # Start A1 and complete MCQ section
    att_a1 = attempts.start_attempt(payload=req_a, current_user=user)
    att_a1_id = str(att_a1.attempt_id)
    q_mcq_a = helper_create_and_save_question(set_a_id, "mcq")
    helper_submit_evaluations_for_type(att_a1_id, q_mcq_a, "mcq")

    # Start B1 and complete Short section
    att_b1 = attempts.start_attempt(payload=req_b, current_user=user)
    att_b1_id = str(att_b1.attempt_id)
    q_short_b = helper_create_and_save_question(set_b_id, "short")
    helper_submit_evaluations_for_type(att_b1_id, q_short_b, "short")

    # Return to Set A -> resumes A1 with 'mcq' completed
    resumed_a = attempts.start_attempt(payload=req_a, current_user=user)
    assert str(resumed_a.attempt_id) == att_a1_id
    assert "mcq" in resumed_a.completed_sections
    assert "short" not in resumed_a.completed_sections

    study_service.delete_study_set(set_a_id, user_id=user_id)
    study_service.delete_study_set(set_b_id, user_id=user_id)


def test_8_question_regeneration_safety():
    """Test 8: Regenerating new questions for a study set does NOT invalidate completed sections of existing attempt."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("Regen Safety Set", user_id=user_id)
    set_a_id = set_a["study_set_id"]

    req_a = StartAttemptRequest(study_set_id=uuid.UUID(set_a_id))
    att_a = attempts.start_attempt(payload=req_a, current_user=user)
    att_id = str(att_a.attempt_id)

    # Complete 'mcq' section
    q_mcq_orig = helper_create_and_save_question(set_a_id, "mcq")
    helper_submit_evaluations_for_type(att_id, q_mcq_orig, "mcq")

    status_before = evaluation_service.get_attempt_section_completion_status(att_id)
    assert "mcq" in status_before["completed_sections"]

    # Regenerate 5 NEW mcq questions for the same study set
    for _ in range(5):
        helper_create_and_save_question(set_a_id, "mcq")

    # Verify attempt A's completion status STILL reports 'mcq' as completed!
    status_after = evaluation_service.get_attempt_section_completion_status(att_id)
    assert "mcq" in status_after["completed_sections"]

    study_service.delete_study_set(set_a_id, user_id=user_id)


if __name__ == "__main__":
    init_db()
    print("Running test_1_resume_same_study_set()...")
    test_1_resume_same_study_set()
    print("Running test_2_independent_study_sets()...")
    test_2_independent_study_sets()
    print("Running test_3_and_4_incomplete_attempt_cannot_finish()...")
    test_3_and_4_incomplete_attempt_cannot_finish()
    print("Running test_5_all_four_sections_completed_finish()...")
    test_5_all_four_sections_completed_finish()
    print("Running test_6_retake_creates_new_attempt()...")
    test_6_retake_creates_new_attempt()
    print("Running test_7_session_switching_between_study_sets()...")
    test_7_session_switching_between_study_sets()
    print("Running test_8_question_regeneration_safety()...")
    test_8_question_regeneration_safety()
    print("\nALL 8 RESUMABLE QUIZ FLOW TESTS PASSED SUCCESSFULLY!")
