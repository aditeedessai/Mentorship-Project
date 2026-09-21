import sys
import uuid
from pathlib import Path

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
from backend.services import study_service
from backend.database import quiz_repository, attempt_repository, revision_repository
from backend.api.routes import attempts
from backend.api.deps import AuthenticatedUser
from backend.api.schemas.attempt import StartAttemptRequest, AttemptStatus
from backend.api.schemas.answer import SubmitAnswersRequest, AnswerItem
from backend.api.schemas.question import QuestionType


def get_test_user_id():
    return "51894975-43bb-4e64-8fa1-9492453b558e"


if pytest:
    @pytest.fixture(autouse=True)
    def setup_database():
        init_db()


def helper_create_and_save_questions(study_set_id: str, question_type: str, count: int = 3) -> list[str]:
    q_ids = []
    questions_data = []
    for i in range(count):
        q_id = f"q_{question_type}_{i+1}_{uuid.uuid4().hex[:6]}"
        q_ids.append(q_id)
        questions_data.append({
            "question_id": q_id,
            "study_set_id": study_set_id,
            "question_type": question_type,
            "topic": "General",
            "question": f"Sample {question_type} question {i+1}?",
            "reference_answer": f"Reference answer {i+1}",
            "correct_option": "A" if question_type == "mcq" else None,
            "options": {"A": "Option A", "B": "Option B"} if question_type == "mcq" else None,
            "marks": 2.0 if question_type == "mcq" else 10.0
        })
    quiz_repository.save_questions(study_set_id=study_set_id, questions=questions_data)
    return q_ids


def test_partial_submission_resumption_and_revision_lifecycle():
    """
    Verifies that:
    1. Partial answer submission keeps attempt in_progress.
    2. Revision schedule is NOT created for partial attempts.
    3. Partial attempt can be resumed with previous answer preserved.
    4. Submitting remaining answers and calling finish_attempt marks attempt COMPLETED.
    5. Revision schedule IS created exactly once after genuine completion.
    6. Further submissions to completed attempt are rejected with HTTP 400.
    """
    init_db()
    user_id = get_test_user_id()
    user = AuthenticatedUser(user_id=user_id)

    set_a = study_service.create_study_set("Partial Resumption Lifecycle Set", user_id=user_id)
    set_a_id = set_a["study_set_id"]

    q_ids = helper_create_and_save_questions(set_a_id, "mcq", count=2)
    q1_id, q2_id = q_ids[0], q_ids[1]

    req = StartAttemptRequest(study_set_id=uuid.UUID(set_a_id), question_type="mcq")

    # 1. Start Attempt -> in_progress
    att_1 = attempts.start_attempt(payload=req, current_user=user)
    att_id = str(att_1.attempt_id)
    assert att_1.status == AttemptStatus.IN_PROGRESS

    # 2. Submit partial answer (1 out of 2 questions)
    sub_partial = SubmitAnswersRequest(
        question_type=QuestionType.MCQ,
        answers=[AnswerItem(question_id=q1_id, student_answer="A")]
    )
    res_partial = attempts.submit_section_answers(att_id, payload=sub_partial, current_user=user)
    assert res_partial is not None

    # Verify attempt is STILL in_progress
    att_check = attempt_repository.get_attempt(att_id, user_id=user_id)
    assert att_check["status"] == "in_progress"

    # Verify NO revision schedule exists for this set/type
    sched_partial = revision_repository.get_schedule(set_a_id, "mcq")
    assert sched_partial is None

    # 3. Resume active attempt (re-open quiz)
    att_resumed = attempts.start_attempt(payload=req, current_user=user)
    assert str(att_resumed.attempt_id) == att_id
    assert att_resumed.status == AttemptStatus.IN_PROGRESS

    # 4. Submit remaining answer (2nd question)
    sub_remaining = SubmitAnswersRequest(
        question_type=QuestionType.MCQ,
        answers=[AnswerItem(question_id=q2_id, student_answer="B")]
    )
    res_remaining = attempts.submit_section_answers(att_id, payload=sub_remaining, current_user=user)
    assert res_remaining is not None

    # 5. Call finish_attempt -> transitions to completed
    finished = attempts.finish_attempt(att_id, current_user=user)
    assert finished.status == AttemptStatus.COMPLETED
    assert finished.is_attempt_complete is True

    # Verify revision schedule IS created after completion
    sched_completed = revision_repository.get_schedule(set_a_id, "mcq")
    assert sched_completed is not None
    assert sched_completed["attempts_taken"] == 1

    # 6. Re-submitting answers to completed attempt raises HTTP 400
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.submit_section_answers(att_id, payload=sub_partial, current_user=user)
        assert exc_info.value.status_code == 400
        assert "completed" in str(exc_info.value.detail).lower()

    # Cleanup
    study_service.delete_study_set(set_a_id, user_id=user_id)


if __name__ == "__main__":
    test_partial_submission_resumption_and_revision_lifecycle()
    print("Test passed successfully!")
