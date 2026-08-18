import os
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
    # pyrefly: ignore [missing-import]
    import pytest
except ImportError:
    pytest = None

from backend.database.database import init_db
from backend.database.attempt_repository import get_attempt
from backend.database.evaluation_repository import get_evaluations_by_attempt
from backend.services.evaluation_service import run_evaluation


if pytest:
    @pytest.fixture(autouse=True)
    def setup_database():
        """Ensure database schema is initialized before running tests."""
        init_db()



def test_full_scoring_flow():
    """
    Test complete quiz evaluation flow with multiple topics, multiple question types,
    and varied marks awarded.
    """
    session_id = uuid.uuid4().hex[:8]
    attempt_id = f"test-full-{session_id}"

    mock_questions = [
        {
            "question_id": f"q1_{session_id}",
            "question_type": "mcq",
            "topic": "Operating Systems",
            "question": "What is process paging?",
            "options": {"A": "Memory management scheme", "B": "Disk scheduling", "C": "Network protocol", "D": "File system"},
            "correct_option": "A",
            "student_answer": "A",
            "max_marks": 2.0
        },
        {
            "question_id": f"q2_{session_id}",
            "question_type": "mcq",
            "topic": "Operating Systems",
            "question": "Which scheduling algorithm causes starvation?",
            "options": {"A": "Round Robin", "B": "Priority Scheduling", "C": "FIFO", "D": "SJF non-preemptive"},
            "correct_option": "B",
            "student_answer": "C",  # Wrong answer
            "max_marks": 2.0
        },
        {
            "question_id": f"q3_{session_id}",
            "question_type": "application",
            "topic": "Computer Networks",
            "question": "Explain how TCP handles congestion control using slow start.",
            "reference_answer": "TCP slow start exponentially increases the congestion window size starting from 1 MSS until a threshold is reached or packet loss occurs.",
            "student_answer": "TCP slow start increases the congestion window size exponentially starting from 1 MSS until it reaches the threshold or detects packet loss.",
            "max_marks": 10.0
        },
        {
            "question_id": f"q4_{session_id}",
            "question_type": "short",
            "topic": "Computer Networks",
            "question": "What is the primary function of DNS?",
            "reference_answer": "Domain Name System (DNS) translates human-readable domain names into IP addresses.",
            "student_answer": "DNS resolves domain names into numerical IP addresses.",
            "max_marks": 10.0
        }
    ]

    response = run_evaluation(mock_questions, attempt_id=attempt_id)

    # 1. Verify top-level response keys
    assert "attempt_id" in response
    assert "total_marks" in response
    assert "earned_marks" in response
    assert "percentage" in response
    assert "results" in response
    assert "performance" in response
    assert "topic_performance" in response

    assert len(response["results"]) == 4
    assert response["total_marks"] == 24.0

    # 2. Verify Section-wise Performance
    perf = response["performance"]
    assert "overall_percentage" in perf
    assert "overall_remark" in perf
    assert "strongest_section" in perf
    assert "weakest_section" in perf
    assert "consistency" in perf
    assert "sections" in perf
    assert "attempted_sections" in perf
    assert "not_attempted" in perf

    # Attempted sections should include 'mcq', 'application', 'short'
    assert set(perf["attempted_sections"]) == {"mcq", "application", "short"}
    assert "long" in perf["not_attempted"]

    # 3. Verify Topic-wise Performance
    t_perf = response["topic_performance"]
    assert "topics" in t_perf
    assert "Operating Systems" in t_perf["topics"]
    assert "Computer Networks" in t_perf["topics"]
    assert "overall_percentage" in t_perf
    assert "overall_remark" in t_perf
    assert "remark_strong_topics" in t_perf
    assert "remark_weak_topics" in t_perf

    os_topic = t_perf["topics"]["Operating Systems"]
    assert os_topic["max_marks"] == 4.0
    assert os_topic["marks_awarded"] == 2.0
    assert os_topic["percentage"] == 50.0

    # 4. Verify Database Persistence
    attempt_id = response["attempt_id"]
    saved_attempt = get_attempt(attempt_id)
    assert saved_attempt is not None
    assert saved_attempt["attempt_id"] == attempt_id
    assert abs(saved_attempt["total_marks"] - response["total_marks"]) < 1e-4
    assert abs(saved_attempt["marks_awarded"] - response["earned_marks"]) < 1e-4

    saved_evals = get_evaluations_by_attempt(attempt_id)
    assert len(saved_evals) == 4


def test_empty_questions():
    """Verify handling of empty questions list without division by zero."""
    response = run_evaluation([])

    assert response["total_marks"] == 0.0
    assert response["earned_marks"] == 0.0
    assert response["percentage"] == 0.0
    assert response["results"] == []
    assert response["performance"]["overall_percentage"] == 0.0
    assert response["topic_performance"]["overall_percentage"] == 0.0


def test_missing_fields_fallback():
    """Verify safe fallback for missing topic, question_type, or max_marks."""
    inc_id = f"inc1_{uuid.uuid4().hex[:6]}"
    incomplete_question = [
        {
            # missing topic, question_type, max_marks
            "question_id": inc_id,
            "question": "Define operating system.",
            "reference_answer": "An operating system manages computer hardware and software resources.",
            "student_answer": "An OS manages hardware and software resources.",
        }
    ]

    response = run_evaluation(incomplete_question)

    assert len(response["results"]) == 1
    assert response["total_marks"] == 10.0  # defaulted to non-mcq 10.0
    t_perf = response["topic_performance"]
    assert "general" in t_perf["topics"]  # defaulted topic to 'general'


def test_cumulative_session_flow():
    """
    Verify incremental multi-section assessment flow:
    1. Short Answer completed -> View Performance -> Short Answer + Cumulative
    2. MCQ completed -> View Performance -> Short + MCQ + Cumulative (marks-based)
    3. Application completed -> View Performance -> Short + MCQ + Application + Cumulative
    4. Unattempted sections remain excluded from cumulative calculation.
    """
    attempt_id = f"test-cum-session-{uuid.uuid4()}"
    short_qid = f"cum_short_{uuid.uuid4().hex[:6]}"
    mcq_qid = f"cum_mcq_{uuid.uuid4().hex[:6]}"
    app_qid = f"cum_app_{uuid.uuid4().hex[:6]}"

    # Step 1: Complete Short Answer
    short_questions = [
        {
            "question_id": short_qid,
            "question_type": "short",
            "topic": "Operating Systems",
            "question": "What is a deadlock?",
            "reference_answer": "A deadlock is a set of blocked processes each holding a resource and waiting for another resource.",
            "student_answer": "A deadlock is when processes wait indefinitely for resources held by each other.",
            "max_marks": 10.0
        }
    ]

    # Evaluate section (should not automatically print performance summary)
    eval_res1 = run_evaluation(questions=short_questions, attempt_id=attempt_id, display_performance=False)
    assert eval_res1["attempt_id"] == attempt_id
    assert len(eval_res1["results"]) == 1

    # View Current Performance after Short Answer
    perf1 = run_evaluation(questions=[], attempt_id=attempt_id, display_performance=True)
    sec1 = perf1["performance"]["sections"]
    assert set(perf1["performance"]["attempted_sections"]) == {"short"}
    assert "short" in sec1
    assert sec1["short"]["marks_awarded"] == eval_res1["results"][0]["marks_awarded"]
    assert sec1["short"]["max_marks"] == 10.0
    assert sec1["short"]["percentage"] == round(eval_res1["results"][0]["marks_awarded"] / 10.0 * 100.0, 2)
    assert "remark" in sec1["short"]

    # Cumulative marks = Short Answer marks
    assert perf1["performance"]["earned_marks"] == sec1["short"]["marks_awarded"]
    assert perf1["performance"]["total_marks"] == 10.0
    assert perf1["performance"]["overall_percentage"] == sec1["short"]["percentage"]

    # Topics include Operating Systems
    assert "Operating Systems" in perf1["topic_performance"]["topics"]
    assert "Computer Networks" not in perf1["topic_performance"]["topics"]

    # Step 2: Complete MCQ
    mcq_questions = [
        {
            "question_id": mcq_qid,
            "question_type": "mcq",
            "topic": "Computer Networks",
            "question": "Which layer handles routing?",
            "options": {"A": "Transport", "B": "Network", "C": "Data Link", "D": "Physical"},
            "correct_option": "B",
            "student_answer": "B",
            "max_marks": 2.0
        }
    ]

    eval_res2 = run_evaluation(questions=mcq_questions, attempt_id=attempt_id, display_performance=False)
    assert len(eval_res2["results"]) == 1
    assert eval_res2["results"][0]["marks_awarded"] == 2.0

    # View Current Performance after MCQ
    perf2 = run_evaluation(questions=[], attempt_id=attempt_id, display_performance=True)
    sec2 = perf2["performance"]["sections"]
    assert set(perf2["performance"]["attempted_sections"]) == {"short", "mcq"}
    assert "short" in sec2 and "mcq" in sec2

    # Verify cumulative marks = Short + MCQ
    expected_earned = round(sec1["short"]["marks_awarded"] + 2.0, 2)
    expected_total = 12.0
    expected_overall_pct = round((expected_earned / expected_total) * 100.0, 2)

    assert perf2["performance"]["earned_marks"] == expected_earned
    assert perf2["performance"]["total_marks"] == expected_total
    assert perf2["performance"]["overall_percentage"] == expected_overall_pct

    # Cumulative topics now include both Operating Systems and Computer Networks
    assert "Operating Systems" in perf2["topic_performance"]["topics"]
    assert "Computer Networks" in perf2["topic_performance"]["topics"]

    # Step 3: Complete Application section
    app_questions = [
        {
            "question_id": app_qid,
            "question_type": "application",
            "topic": "Database Systems",
            "question": "Apply ACID properties to a banking transaction scenario.",
            "reference_answer": "Atomicity ensures all-or-nothing transfer, Consistency maintains balance invariants, Isolation hides concurrent transfers, Durability persists committed balances.",
            "student_answer": "Atomicity ensures all operations complete or none do, Consistency maintains account balances, Isolation prevents dirty reads, Durability saves to disk.",
            "max_marks": 10.0
        }
    ]

    eval_res3 = run_evaluation(questions=app_questions, attempt_id=attempt_id, display_performance=False)
    app_earned = eval_res3["results"][0]["marks_awarded"]

    # View Current Performance after Application
    perf3 = run_evaluation(questions=[], attempt_id=attempt_id, display_performance=True)
    sec3 = perf3["performance"]["sections"]
    assert set(perf3["performance"]["attempted_sections"]) == {"short", "mcq", "application"}
    assert "long" in perf3["performance"]["not_attempted"]

    expected_earned_3 = round(expected_earned + app_earned, 2)
    expected_total_3 = 22.0
    expected_pct_3 = round((expected_earned_3 / expected_total_3) * 100.0, 2)

    assert perf3["performance"]["earned_marks"] == expected_earned_3
    assert perf3["performance"]["total_marks"] == expected_total_3
    assert perf3["performance"]["overall_percentage"] == expected_pct_3

    # All three topics present
    assert "Operating Systems" in perf3["topic_performance"]["topics"]
    assert "Computer Networks" in perf3["topic_performance"]["topics"]
    assert "Database Systems" in perf3["topic_performance"]["topics"]

    # DB attempt record updated with exact cumulative totals
    saved = get_attempt(attempt_id)
    assert saved is not None
    assert saved["total_marks"] == 22.0
    assert abs(saved["marks_awarded"] - expected_earned_3) < 1e-4


if __name__ == "__main__":
    init_db()
    print("Running test_full_scoring_flow()...")
    test_full_scoring_flow()
    print("Running test_empty_questions()...")
    test_empty_questions()
    print("Running test_missing_fields_fallback()...")
    test_missing_fields_fallback()
    print("Running test_cumulative_session_flow()...")
    test_cumulative_session_flow()
    print("\nALL TESTS PASSED SUCCESSFULLY!")


