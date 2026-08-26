import sys
import uuid
from pathlib import Path

TEST_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = TEST_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"

for p in (str(PROJECT_ROOT), str(BACKEND_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

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
    try:
        row = conn.execute("SELECT user_id FROM quiz_attempts WHERE user_id IS NOT NULL LIMIT 1").fetchone()
        if row and row.get("user_id"):
            return str(row["user_id"])
    except Exception:
        pass
    return None

def run_audit():
    init_db()
    conn = get_connection()
    user_id = get_existing_user_id(conn)
    conn.close()
    if not user_id:
        print("ERROR: No existing user_id found in database.")
        return

    user = AuthenticatedUser(user_id=user_id)

    print("=== STARTING PRIORITY 1 QUIZ FLOW E2E AUDIT ===")

    # Create Study Set A & B
    set_a = study_service.create_study_set("Audit Set A", user_id=user_id)
    set_b = study_service.create_study_set("Audit Set B", user_id=user_id)
    set_a_id = set_a["study_set_id"]
    set_b_id = set_b["study_set_id"]

    # Create questions for Set A and Set B
    q_map_a = {}
    q_map_b = {}
    for stype in ["mcq", "short", "application", "long"]:
        q_a = f"q_a_{stype}_{uuid.uuid4().hex[:4]}"
        quiz_repository.save_questions(set_a_id, [{
            "question_id": q_a,
            "study_set_id": set_a_id,
            "question_type": stype,
            "topic": "Audit",
            "question": f"Question {stype}?",
            "reference_answer": "Answer",
            "correct_option": "A" if stype == "mcq" else None,
            "options": {"A": "Opt A", "B": "Opt B"} if stype == "mcq" else None,
            "marks": 2.0 if stype == "mcq" else 10.0
        }])
        q_map_a[stype] = q_a

        q_b = f"q_b_{stype}_{uuid.uuid4().hex[:4]}"
        quiz_repository.save_questions(set_b_id, [{
            "question_id": q_b,
            "study_set_id": set_b_id,
            "question_type": stype,
            "topic": "Audit",
            "question": f"Question {stype}?",
            "reference_answer": "Answer",
            "correct_option": "A" if stype == "mcq" else None,
            "options": {"A": "Opt A", "B": "Opt B"} if stype == "mcq" else None,
            "marks": 2.0 if stype == "mcq" else 10.0
        }])
        q_map_b[stype] = q_b

    # -------------------------------------------------------------
    # Scenario 1: First section (MCQ)
    # -------------------------------------------------------------
    req_a = StartAttemptRequest(study_set_id=uuid.UUID(set_a_id))
    att_1 = attempts.start_attempt(payload=req_a, current_user=user)
    att_1_id = str(att_1.attempt_id)
    print(f"Scenario 1 - Attempt 1 Created: ID={att_1_id}, Status={att_1.status}")
    assert att_1.status == AttemptStatus.IN_PROGRESS

    # Save evaluation for MCQ
    evaluation_repository.save_evaluation(q_map_a["mcq"], "A", {"final_score": 1.0, "marks_awarded": 2.0, "is_correct": True}, att_1_id)

    perf_1 = evaluation_service.get_attempt_performance_summary(att_1_id)
    print(f"Scenario 1 - Post MCQ: completed={perf_1['completed_sections']}, remaining={perf_1['remaining_sections']}, is_complete={perf_1['is_attempt_complete']}")
    assert perf_1['is_attempt_complete'] is False
    assert "mcq" in perf_1['completed_sections']
    print("Scenario 1: PASS")

    # -------------------------------------------------------------
    # Scenario 2: Resume
    # -------------------------------------------------------------
    resumed_1 = attempts.get_active_attempt_for_study_set(uuid.UUID(set_a_id), current_user=user)
    assert str(resumed_1.attempt_id) == att_1_id
    assert "mcq" in resumed_1.completed_sections
    print(f"Scenario 2 - Resumed attempt ID: {resumed_1.attempt_id}, Completed: {resumed_1.completed_sections}")
    print("Scenario 2: PASS")

    # -------------------------------------------------------------
    # Scenario 3: Any-order section (Application before Short)
    # -------------------------------------------------------------
    evaluation_repository.save_evaluation(q_map_a["application"], "Sample app answer", {"final_score": 1.0, "marks_awarded": 10.0, "is_correct": True}, att_1_id)
    perf_3 = evaluation_service.get_attempt_performance_summary(att_1_id)
    print(f"Scenario 3 - Post Application: completed={perf_3['completed_sections']}, remaining={perf_3['remaining_sections']}")
    assert "application" in perf_3['completed_sections']
    assert "short" in perf_3['remaining_sections']
    assert "long" in perf_3['remaining_sections']
    print("Scenario 3: PASS")

    # -------------------------------------------------------------
    # Scenario 4: Multiple sections (Short) & Premature finish check
    # -------------------------------------------------------------
    evaluation_repository.save_evaluation(q_map_a["short"], "Sample short answer", {"final_score": 1.0, "marks_awarded": 10.0, "is_correct": True}, att_1_id)
    perf_4 = evaluation_service.get_attempt_performance_summary(att_1_id)
    print(f"Scenario 4 - Post 3rd section: completed={perf_4['completed_sections']}, remaining={perf_4['remaining_sections']}")
    assert len(perf_4['completed_sections']) == 3
    
    # Try premature finish -> must raise HTTP 400
    try:
        attempts.finish_attempt(att_1_id, current_user=user)
        assert False, "Should have raised HTTP 400"
    except HTTPException as exc:
        assert exc.status_code == 400
        print(f"Scenario 4 - Premature finish correctly rejected with 400: {exc.detail}")
    print("Scenario 4: PASS")

    # -------------------------------------------------------------
    # Scenario 5: Final section (Long) & Finish Attempt
    # -------------------------------------------------------------
    evaluation_repository.save_evaluation(q_map_a["long"], "Sample long answer", {"final_score": 1.0, "marks_awarded": 10.0, "is_correct": True}, att_1_id)
    perf_5 = evaluation_service.get_attempt_performance_summary(att_1_id)
    print(f"Scenario 5 - Post 4th section: completed={perf_5['completed_sections']}, is_complete={perf_5['is_attempt_complete']}")
    assert perf_5['is_attempt_complete'] is True

    finished_att = attempts.finish_attempt(att_1_id, current_user=user)
    print(f"Scenario 5 - Finished attempt status: {finished_att.status}")
    assert finished_att.status == AttemptStatus.COMPLETED
    print("Scenario 5: PASS")

    # -------------------------------------------------------------
    # Scenario 6: Retake
    # -------------------------------------------------------------
    att_2 = attempts.start_attempt(payload=req_a, current_user=user)
    att_2_id = str(att_2.attempt_id)
    print(f"Scenario 6 - Retake Attempt ID: {att_2_id} (Old Attempt ID: {att_1_id})")
    assert att_2_id != att_1_id
    assert att_2.status == AttemptStatus.IN_PROGRESS

    old_att = attempt_repository.get_attempt(att_1_id, user_id=user_id)
    assert old_att["status"] == "completed"
    print("Scenario 6: PASS")

    # -------------------------------------------------------------
    # Scenario 7: Study set isolation
    # -------------------------------------------------------------
    req_b = StartAttemptRequest(study_set_id=uuid.UUID(set_b_id))
    att_b1 = attempts.start_attempt(payload=req_b, current_user=user)
    att_b1_id = str(att_b1.attempt_id)
    print(f"Scenario 7 - Study Set B Attempt ID: {att_b1_id}, Set A active ID: {att_2_id}")
    assert att_b1_id != att_2_id
    assert str(att_b1.study_set_id) == set_b_id
    print("Scenario 7: PASS")

    # -------------------------------------------------------------
    # Scenario 8: Backend security
    # -------------------------------------------------------------
    # 1. Question from set B submitted to set A attempt att_2
    sub_cross = SubmitAnswersRequest(
        question_type=QuestionType.SHORT,
        answers=[AnswerItem(question_id=q_map_b["short"], student_answer="Cross attempt answer")]
    )
    try:
        attempts.submit_section_answers(att_2_id, payload=sub_cross, current_user=user)
        assert False, "Should reject cross study set question"
    except HTTPException as exc:
        assert exc.status_code == 400
        print(f"Scenario 8.1 - Cross question rejected with 400: {exc.detail}")

    # 2. Resubmitting a completed section for att_1 (completed attempt)
    sub_repeat = SubmitAnswersRequest(
        question_type=QuestionType.MCQ,
        answers=[AnswerItem(question_id=q_map_a["mcq"], student_answer="A")]
    )
    try:
        attempts.submit_section_answers(att_1_id, payload=sub_repeat, current_user=user)
        assert False, "Should reject submission to completed attempt"
    except HTTPException as exc:
        assert exc.status_code == 400
        print(f"Scenario 8.2 - Submission to completed attempt rejected with 400: {exc.detail}")
    print("Scenario 8: PASS")

    # -------------------------------------------------------------
    # Scenario 9: Browser refresh/resume
    # -------------------------------------------------------------
    refreshed_active = attempts.get_active_attempt_for_study_set(uuid.UUID(set_a_id), current_user=user)
    assert str(refreshed_active.attempt_id) == att_2_id
    print(f"Scenario 9 - Refreshed/resumed attempt ID: {refreshed_active.attempt_id}")
    print("Scenario 9: PASS")

    # Clean up test sets
    study_service.delete_study_set(set_a_id, user_id=user_id)
    study_service.delete_study_set(set_b_id, user_id=user_id)

    print("\n=== ALL 9 SCENARIOS AUDITED AND VERIFIED (PASS) ===")

if __name__ == "__main__":
    run_audit()
