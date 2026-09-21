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
from backend.database import quiz_repository, attempt_repository, evaluation_repository, revision_repository
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


def helper_create_and_save_questions(study_set_id: str, question_type: str, count: int = 3, attempt_id: str = None) -> list[dict]:
    questions_data = []
    for i in range(count):
        q_id = f"q_{question_type}_{i+1}_{uuid.uuid4().hex[:6]}"
        questions_data.append({
            "question_id": q_id,
            "study_set_id": study_set_id,
            "attempt_id": attempt_id,
            "question_type": question_type,
            "topic": "General",
            "question": f"Sample {question_type} question {i+1}?",
            "reference_answer": f"Reference answer {i+1}",
            "correct_option": "A" if question_type == "mcq" else None,
            "options": {"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"} if question_type == "mcq" else None,
            "marks": 2.0 if question_type == "mcq" else 10.0
        })
    quiz_repository.save_questions(study_set_id=study_set_id, questions=questions_data, attempt_id=attempt_id)
    return questions_data


def test_answer_persistence_resumption_and_editability_flow():
    """
    Comprehensive test covering Requirements A-G:
    A. Partial answer persistence (attempt remains IN_PROGRESS, evaluation exists).
    B. Resume (same attempt_id, same question IDs, saved answers restored via get_evaluations).
    C. Edit previously answered MCQ (Save Q1 = B, resume, change Q1 = C, verify DB has C, not B).
    D. Edit previously answered text question (Save Q1 = text1, resume, change Q1 = text2, verify DB has text2).
    E. Unanswered questions remain unanswered.
    F. Completion (Finish attempt marks COMPLETED, revision scheduled once).
    G. Completed attempt lock (further answers rejected with HTTP 400).
    """
    init_db()
    user_id = get_test_user_id()
    user = AuthenticatedUser(user_id=user_id)

    # Setup study set
    set_a = study_service.create_study_set("Resumption & Editability Test Set", user_id=user_id)
    set_a_id = set_a["study_set_id"]

    # 1. Start MCQ Attempt
    req_mcq = StartAttemptRequest(study_set_id=uuid.UUID(set_a_id), question_type="mcq")
    att_mcq = attempts.start_attempt(payload=req_mcq, current_user=user)
    att_mcq_id = str(att_mcq.attempt_id)
    assert att_mcq.status == AttemptStatus.IN_PROGRESS

    # Create 3 MCQ questions for this attempt
    mcq_qs = helper_create_and_save_questions(set_a_id, "mcq", count=3, attempt_id=att_mcq_id)
    q1_mcq_id, q2_mcq_id, q3_mcq_id = mcq_qs[0]["question_id"], mcq_qs[1]["question_id"], mcq_qs[2]["question_id"]

    # =========================================================================
    # A. PARTIAL ANSWER PERSISTENCE (MCQ Q1 = "B")
    # =========================================================================
    sub_q1_b = SubmitAnswersRequest(
        question_type=QuestionType.MCQ,
        answers=[AnswerItem(question_id=q1_mcq_id, student_answer="B")]
    )
    res_q1 = attempts.submit_section_answers(att_mcq_id, payload=sub_q1_b, current_user=user)
    assert res_q1 is not None

    # Verify attempt is STILL IN_PROGRESS
    att_check = attempt_repository.get_attempt(att_mcq_id, user_id=user_id)
    assert att_check["status"] == "in_progress"

    # Verify evaluation exists in DB
    evals_1 = evaluation_repository.get_evaluations_by_attempt(att_mcq_id)
    eval_map_1 = {e["question_id"]: e["student_answer"] for e in evals_1}
    assert q1_mcq_id in eval_map_1
    assert eval_map_1[q1_mcq_id] == "B"

    # =========================================================================
    # B. RESUME (Re-opening attempt returns SAME attempt_id & same questions)
    # =========================================================================
    resumed_mcq = attempts.start_attempt(payload=req_mcq, current_user=user)
    assert str(resumed_mcq.attempt_id) == att_mcq_id

    # Verify same question IDs are returned from questions endpoint
    loaded_qs = quiz_repository.get_questions_by_study_set(set_a_id, attempt_id=att_mcq_id)
    loaded_q_ids = [q["question_id"] for q in loaded_qs]
    assert loaded_q_ids == [q1_mcq_id, q2_mcq_id, q3_mcq_id]

    # Verify saved answer is restored via get_attempt_evaluations endpoint
    eval_resp = attempts.get_attempt_evaluations(att_mcq_id, current_user=user)
    restored_map = {item.question_id: item.student_answer for item in eval_resp.results}
    assert restored_map[q1_mcq_id] == "B"

    # =========================================================================
    # E. UNANSWERED QUESTIONS REMAIN UNANSWERED
    # =========================================================================
    assert q2_mcq_id not in restored_map or restored_map[q2_mcq_id] is None
    assert q3_mcq_id not in restored_map or restored_map[q3_mcq_id] is None

    # =========================================================================
    # C. EDIT PREVIOUSLY ANSWERED MCQ (Change Q1 from "B" to "C")
    # =========================================================================
    sub_q1_c = SubmitAnswersRequest(
        question_type=QuestionType.MCQ,
        answers=[AnswerItem(question_id=q1_mcq_id, student_answer="C")]
    )
    attempts.submit_section_answers(att_mcq_id, payload=sub_q1_c, current_user=user)

    # Verify evaluation in DB was UPDATED to "C" (no duplicates, previous "B" replaced)
    evals_2 = evaluation_repository.get_evaluations_by_attempt(att_mcq_id)
    q1_evals = [e for e in evals_2 if e["question_id"] == q1_mcq_id]
    assert len(q1_evals) == 1, "Should be exactly 1 evaluation row per question_id"
    assert q1_evals[0]["student_answer"] == "C"

    # =========================================================================
    # D. EDIT PREVIOUSLY ANSWERED TEXT QUESTION (Short Answer Flow)
    # =========================================================================
    req_short = StartAttemptRequest(study_set_id=uuid.UUID(set_a_id), question_type="short")
    att_short = attempts.start_attempt(payload=req_short, current_user=user)
    att_short_id = str(att_short.attempt_id)

    short_qs = helper_create_and_save_questions(set_a_id, "short", count=2, attempt_id=att_short_id)
    sq1_id, sq2_id = short_qs[0]["question_id"], short_qs[1]["question_id"]

    # Initial text answer for SQ1
    sub_text1 = SubmitAnswersRequest(
        question_type=QuestionType.SHORT,
        answers=[AnswerItem(question_id=sq1_id, student_answer="Initial text answer for Q1.")]
    )
    attempts.submit_section_answers(att_short_id, payload=sub_text1, current_user=user)

    # Resume & Edit SQ1 text answer
    sub_text2 = SubmitAnswersRequest(
        question_type=QuestionType.SHORT,
        answers=[AnswerItem(question_id=sq1_id, student_answer="Updated and refined text answer for Q1.")]
    )
    attempts.submit_section_answers(att_short_id, payload=sub_text2, current_user=user)

    # Verify database contains updated text
    sq_evals = evaluation_repository.get_evaluations_by_attempt(att_short_id)
    sq1_evals = [e for e in sq_evals if e["question_id"] == sq1_id]
    assert len(sq1_evals) == 1
    assert sq1_evals[0]["student_answer"] == "Updated and refined text answer for Q1."

    # =========================================================================
    # F. COMPLETION (Submit remaining answers, finish quiz, verify schedule created once)
    # =========================================================================
    # Submit remaining answers for MCQ attempt
    sub_mcq_all = SubmitAnswersRequest(
        question_type=QuestionType.MCQ,
        answers=[
            AnswerItem(question_id=q2_mcq_id, student_answer="A"),
            AnswerItem(question_id=q3_mcq_id, student_answer="D")
        ]
    )
    attempts.submit_section_answers(att_mcq_id, payload=sub_mcq_all, current_user=user)

    # Finish MCQ attempt
    finished_mcq = attempts.finish_attempt(att_mcq_id, current_user=user)
    assert finished_mcq.status == AttemptStatus.COMPLETED
    assert finished_mcq.is_attempt_complete is True

    # Verify revision schedule is created for MCQ
    sched = revision_repository.get_schedule(set_a_id, "mcq")
    assert sched is not None
    assert sched["attempts_taken"] == 1

    # =========================================================================
    # G. COMPLETED ATTEMPT LOCK (Submissions to completed attempt rejected)
    # =========================================================================
    if pytest:
        with pytest.raises(HTTPException) as exc_info:
            attempts.submit_section_answers(att_mcq_id, payload=sub_q1_b, current_user=user)
        assert exc_info.value.status_code == 400
        assert "completed" in str(exc_info.value.detail).lower()

    # Cleanup test study set
    study_service.delete_study_set(set_a_id, user_id=user_id)


if __name__ == "__main__":
    test_answer_persistence_resumption_and_editability_flow()
    print("All answer restoration and editability tests passed successfully!")
