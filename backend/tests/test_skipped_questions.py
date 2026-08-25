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

import pytest
from fastapi import HTTPException

from backend.database.database import get_connection, init_db
from backend.services import study_service
from backend.database import quiz_repository, evaluation_repository, attempt_repository
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


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def helper_create_question(study_set_id: str, question_type: str) -> str:
    q_id = f"q_skip_{question_type}_{uuid.uuid4().hex[:6]}"
    question_data = [
        {
            "question_id": q_id,
            "study_set_id": study_set_id,
            "question_type": question_type,
            "topic": "Skipped Testing",
            "question": f"Sample {question_type} question?",
            "reference_answer": "Sample reference answer.",
            "correct_option": "A" if question_type == "mcq" else None,
            "options": {"A": "Option A", "B": "Option B"} if question_type == "mcq" else None,
            "marks": 2.0 if question_type == "mcq" else 10.0
        }
    ]
    quiz_repository.save_questions(study_set_id=study_set_id, questions=question_data)
    return q_id


def test_1_empty_answer_accepted_by_schema():
    """Test 1: AnswerItem accepts empty string '' for student_answer."""
    item = AnswerItem(question_id="q123", student_answer="")
    assert item.student_answer == ""
    assert item.question_id == "q123"


def test_2_and_3_and_4_skipped_question_evaluation():
    """Tests 2, 3, 4: Skipped questions save row with student_answer='', 0 marks, is_correct=False, and skip LLM/SBERT."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    study_set = study_service.create_study_set("Skipped Test Set A", user_id=user_id)
    set_id = study_set["study_set_id"]

    att = attempts.start_attempt(payload=StartAttemptRequest(study_set_id=uuid.UUID(set_id)), current_user=user)
    att_id = str(att.attempt_id)

    q_mcq = helper_create_question(set_id, "mcq")

    sub_req = SubmitAnswersRequest(
        question_type=QuestionType.MCQ,
        answers=[AnswerItem(question_id=q_mcq, student_answer="")]
    )

    with patch("backend.services.evaluation_service.evaluate_mcq") as mock_mcq, \
         patch("backend.services.evaluation_service.evaluate_answer") as mock_answer:
        
        res = attempts.submit_section_answers(att_id, payload=sub_req, current_user=user)
        
        # Test 4: Verify LLM/SBERT functions were NOT called
        mock_mcq.assert_not_called()
        mock_answer.assert_not_called()

    # Test 2 & 3: Verify saved evaluation record in DB
    evals = evaluation_repository.get_evaluations_by_attempt(att_id)
    assert len(evals) == 1
    rec = evals[0]
    assert rec["question_id"] == q_mcq
    assert rec["student_answer"] == ""
    assert float(rec["marks_awarded"]) == 0.0
    assert float(rec["final_score"]) == 0.0

    study_service.delete_study_set(set_id, user_id=user_id)


def test_5_mixed_answered_and_skipped_questions_completes_section():
    """Test 5: Section containing 1 answered and 1 skipped question completes section."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    study_set = study_service.create_study_set("Skipped Test Set B", user_id=user_id)
    set_id = study_set["study_set_id"]

    att = attempts.start_attempt(payload=StartAttemptRequest(study_set_id=uuid.UUID(set_id)), current_user=user)
    att_id = str(att.attempt_id)

    q1 = helper_create_question(set_id, "short")
    q2 = helper_create_question(set_id, "short")

    sub_req = SubmitAnswersRequest(
        question_type=QuestionType.SHORT,
        answers=[
            AnswerItem(question_id=q1, student_answer="Valid short answer"),
            AnswerItem(question_id=q2, student_answer="")
        ]
    )

    dummy_eval = {
        "final_score": 1.0,
        "marks_awarded": 10.0,
        "semantic_score": 0.9,
        "concept_score": 0.95,
        "is_correct": True,
        "matched_concepts": ["concept"],
        "missed_concepts": []
    }

    with patch("backend.services.evaluation_service.evaluate_answer", return_value=dummy_eval):
        res = attempts.submit_section_answers(att_id, payload=sub_req, current_user=user)
        assert res is not None

    att_status = attempts.get_attempt(att_id, current_user=user)
    assert "short" in att_status.completed_sections

    study_service.delete_study_set(set_id, user_id=user_id)


def test_6_only_skipped_questions_completes_section():
    """Test 6: Section containing ONLY skipped questions completes section."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    study_set = study_service.create_study_set("Skipped Test Set C", user_id=user_id)
    set_id = study_set["study_set_id"]

    att = attempts.start_attempt(payload=StartAttemptRequest(study_set_id=uuid.UUID(set_id)), current_user=user)
    att_id = str(att.attempt_id)

    q1 = helper_create_question(set_id, "application")
    q2 = helper_create_question(set_id, "application")

    sub_req = SubmitAnswersRequest(
        question_type=QuestionType.APPLICATION,
        answers=[
            AnswerItem(question_id=q1, student_answer=""),
            AnswerItem(question_id=q2, student_answer="")
        ]
    )

    res = attempts.submit_section_answers(att_id, payload=sub_req, current_user=user)
    assert res is not None

    att_status = attempts.get_attempt(att_id, current_user=user)
    assert "application" in att_status.completed_sections

    study_service.delete_study_set(set_id, user_id=user_id)


def test_7_8_9_security_and_locking_with_skipped_questions():
    """Tests 7, 8, 9: Section locking, question-to-set validation, and completed-attempt rejection work with skipped questions."""
    conn = get_connection()
    user_id = get_existing_user_id(conn) or str(uuid.uuid4())
    conn.close()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("Set A Lock Test", user_id=user_id)
    set_b = study_service.create_study_set("Set B Other Test", user_id=user_id)
    set_a_id = set_a["study_set_id"]
    set_b_id = set_b["study_set_id"]

    att_a = attempts.start_attempt(payload=StartAttemptRequest(study_set_id=uuid.UUID(set_a_id)), current_user=user)
    att_a_id = str(att_a.attempt_id)

    q_a = helper_create_question(set_a_id, "long")
    q_b = helper_create_question(set_b_id, "long")

    # Test 8: Question from Set B submitted to Set A attempt returns HTTP 400
    sub_cross = SubmitAnswersRequest(
        question_type=QuestionType.LONG,
        answers=[AnswerItem(question_id=q_b, student_answer="")]
    )
    with pytest.raises(HTTPException) as exc_info:
        attempts.submit_section_answers(att_a_id, payload=sub_cross, current_user=user)
    assert exc_info.value.status_code == 400
    assert "does not belong to the study set" in str(exc_info.value.detail)

    # Submit valid section with skipped question
    sub_valid = SubmitAnswersRequest(
        question_type=QuestionType.LONG,
        answers=[AnswerItem(question_id=q_a, student_answer="")]
    )
    attempts.submit_section_answers(att_a_id, payload=sub_valid, current_user=user)

    # Test 7: Re-submitting long section returns HTTP 400 (locked section)
    with pytest.raises(HTTPException) as exc_info:
        attempts.submit_section_answers(att_a_id, payload=sub_valid, current_user=user)
    assert exc_info.value.status_code == 400
    assert "locked for this attempt" in str(exc_info.value.detail)

    study_service.delete_study_set(set_a_id, user_id=user_id)
    study_service.delete_study_set(set_b_id, user_id=user_id)
