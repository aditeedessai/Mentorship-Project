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
from backend.database import study_set_repository, quiz_repository, attempt_repository, revision_repository
from backend.api.routes import attempts
from backend.api.deps import AuthenticatedUser
from backend.api.schemas.answer import EvaluatePracticeRequest, AnswerItem
from backend.api.schemas.question import QuestionType


TEST_USER_A = "51894975-43bb-4e64-8fa1-9492453b558e"
TEST_USER_B = "99999999-9999-9999-9999-999999999999"


if pytest:
    @pytest.fixture(autouse=True)
    def setup_database():
        init_db()


def create_test_fixture():
    """
    Creates a study set, historical attempt, and saved questions for TEST_USER_A.
    """
    conn = get_connection()
    try:
        # Create study set
        study_set_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO study_sets (study_set_id, name, user_id) VALUES (?, ?, ?)",
            (study_set_id, "Practice Retake Test Set", TEST_USER_A)
        )

        # Create 4 completed attempts to exhaust the limit
        historical_attempt_id = str(uuid.uuid4())
        for i in range(1, 5):
            att_id = historical_attempt_id if i == 1 else str(uuid.uuid4())
            conn.execute(
                """
                INSERT INTO quiz_attempts (
                    attempt_id, study_set_id, user_id, question_type, total_marks, marks_awarded, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (att_id, study_set_id, TEST_USER_A, "mcq", 2.0, 2.0, "completed")
            )

        # Record schedule at 4 attempts taken
        conn.execute(
            """
            INSERT INTO revision_schedules (study_set_id, user_id, question_type, attempts_taken, last_accuracy, needs_attention)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (study_set_id, question_type) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                attempts_taken = EXCLUDED.attempts_taken,
                last_accuracy = EXCLUDED.last_accuracy
            """,
            (study_set_id, TEST_USER_A, "mcq", 4, 100.0, False)
        )

        # Create historical question tagged with historical_attempt_id
        q_id = str(uuid.uuid4())
        conn.execute(
            """
            INSERT INTO questions (
                question_id, study_set_id, attempt_id, question_type, topic, question, reference_answer, options, correct_option, marks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                q_id, study_set_id, historical_attempt_id, "mcq", "general",
                "What is Python?", "A programming language",
                '{"A": "Programming Language", "B": "Snake"}', "A", 2.0
            )
        )

        # Insert historical evaluation for historical_attempt_id
        conn.execute(
            """
            INSERT INTO evaluations (attempt_id, question_id, student_answer, final_score, marks_awarded)
            VALUES (?, ?, ?, ?, ?)
            """,
            (historical_attempt_id, q_id, "A", 1.0, 2.0)
        )

        conn.commit()
        return study_set_id, historical_attempt_id, q_id
    finally:
        conn.close()


def cleanup_test_fixture(study_set_id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM evaluations WHERE attempt_id IN (SELECT attempt_id FROM quiz_attempts WHERE study_set_id = ?)", (study_set_id,))
        conn.execute("DELETE FROM questions WHERE study_set_id = ?", (study_set_id,))
        conn.execute("DELETE FROM quiz_attempts WHERE study_set_id = ?", (study_set_id,))
        conn.execute("DELETE FROM revision_schedules WHERE study_set_id = ?", (study_set_id,))
        conn.execute("DELETE FROM study_sets WHERE study_set_id = ?", (study_set_id,))
        conn.commit()
    finally:
        conn.close()


def test_practice_retake_flow():
    study_set_id, historical_attempt_id, q_id = create_test_fixture()
    user_a = AuthenticatedUser(user_id=TEST_USER_A, email="testa@example.com")

    try:
        conn = get_connection()
        initial_attempts_count = conn.execute("SELECT COUNT(*) AS count FROM quiz_attempts").fetchone()["count"]
        initial_evaluations_count = conn.execute("SELECT COUNT(*) AS count FROM evaluations").fetchone()["count"]
        initial_schedule = conn.execute(
            "SELECT attempts_taken FROM revision_schedules WHERE study_set_id = ? AND question_type = 'mcq'",
            (study_set_id,)
        ).fetchone()["attempts_taken"]
        conn.close()

        req = EvaluatePracticeRequest(
            study_set_id=study_set_id,
            attempt_id=historical_attempt_id,
            question_type=QuestionType.MCQ,
            answers=[AnswerItem(question_id=q_id, student_answer="A")]
        )

        # Spy check: patch persistence functions to ensure ZERO calls
        with patch("backend.api.routes.attempts.save_attempt") as mock_save_att, \
             patch("backend.database.evaluation_repository.save_evaluation") as mock_save_eval, \
             patch("backend.services.revision_service.record_attempt_result") as mock_rec_res:

            # Execute practice retake
            response = attempts.evaluate_practice_answers(payload=req, current_user=user_a)

            # Test 9: ZERO persistence functions invoked
            mock_save_att.assert_not_called()
            mock_save_eval.assert_not_called()
            mock_rec_res.assert_not_called()

        # Test 5: Returns valid result structure
        assert response.attempt_id == historical_attempt_id
        assert response.total_marks == 2.0
        assert response.earned_marks == 2.0
        assert response.percentage == 100.0
        assert len(response.results) == 1
        assert response.results[0].question_id == q_id
        assert response.results[0].is_correct is True

        # Verify DB counts after retake
        conn = get_connection()
        after_attempts_count = conn.execute("SELECT COUNT(*) AS count FROM quiz_attempts").fetchone()["count"]
        after_evaluations_count = conn.execute("SELECT COUNT(*) AS count FROM evaluations").fetchone()["count"]
        after_schedule = conn.execute(
            "SELECT attempts_taken FROM revision_schedules WHERE study_set_id = ? AND question_type = 'mcq'",
            (study_set_id,)
        ).fetchone()["attempts_taken"]
        conn.close()

        # Test 1: quiz_attempts count remains unchanged
        assert after_attempts_count == initial_attempts_count
        # Test 2: attempts_taken counter is NOT incremented
        assert after_schedule == initial_schedule == 4
        # Test 3: evaluations count is unchanged
        assert after_evaluations_count == initial_evaluations_count

    finally:
        cleanup_test_fixture(study_set_id)


def test_practice_retake_blocks_unauthorized_user():
    study_set_id, historical_attempt_id, q_id = create_test_fixture()
    user_b = AuthenticatedUser(user_id=TEST_USER_B, email="testb@example.com")

    try:
        req = EvaluatePracticeRequest(
            study_set_id=study_set_id,
            attempt_id=historical_attempt_id,
            question_type=QuestionType.MCQ,
            answers=[AnswerItem(question_id=q_id, student_answer="A")]
        )

        # Test 8: User B cannot practice retake User A's historical attempt
        with pytest.raises(HTTPException) as exc_info:
            attempts.evaluate_practice_answers(payload=req, current_user=user_b)

        assert exc_info.value.status_code == 404

    finally:
        cleanup_test_fixture(study_set_id)


def test_5th_real_attempt_remains_blocked():
    study_set_id, historical_attempt_id, q_id = create_test_fixture()
    user_a = AuthenticatedUser(user_id=TEST_USER_A, email="testa@example.com")

    try:
        from backend.api.schemas.attempt import StartAttemptRequest

        # Test 7: Normal start_attempt for 5th real attempt is blocked
        start_req = StartAttemptRequest(
            study_set_id=study_set_id,
            question_type="mcq"
        )
        with pytest.raises(HTTPException) as exc_info:
            attempts.start_attempt(payload=start_req, current_user=user_a)

        assert exc_info.value.status_code == 400
        assert "attempts_exhausted" in str(exc_info.value.detail)

    finally:
        cleanup_test_fixture(study_set_id)


if __name__ == "__main__":
    pytest.main([__file__])
