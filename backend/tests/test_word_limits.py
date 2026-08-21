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
from backend.config.word_limits import (
    BASE_WORD_LIMITS,
    QUESTION_TYPE_WORD_LIMITS,
    WORD_LIMIT_TOLERANCE,
    count_words,
    validate_answer_word_limit,
)
from backend.database import quiz_repository
from backend.services import evaluation_service, study_service
from backend.api.routes import attempts
from backend.api.schemas.answer import AnswerItem, SubmitAnswersRequest
from backend.api.schemas.attempt import StartAttemptRequest
from backend.api.schemas.question import QuestionType


if pytest:
    @pytest.fixture(autouse=True)
    def setup_database():
        init_db()


def test_word_counting_helper():
    """Requirement 7: Whitespace, tabs, multiple spaces, and newlines are counted correctly."""
    assert count_words("") == 0
    assert count_words(None) == 0
    assert count_words("   ") == 0
    assert count_words("Hello world") == 2
    assert count_words("  Hello   world\nthis\tis  a   test.  ") == 6
    assert count_words("Word1\nWord2\nWord3") == 3


def test_word_limit_validation_rules():
    """Requirements 1-6: Validation rules for short, long, application, and MCQ question types."""
    # 4. Short answer (base=50, tolerance=10 => max 60 words)
    assert QUESTION_TYPE_WORD_LIMITS["short"] == 60

    # 5. Long & Application answer (base=150, tolerance=10 => max 160 words)
    assert QUESTION_TYPE_WORD_LIMITS["long"] == 160
    assert QUESTION_TYPE_WORD_LIMITS["application"] == 160

    # 6. MCQ (no word limit)
    assert QUESTION_TYPE_WORD_LIMITS["mcq"] is None

    # 1. Answer below the limit is accepted
    is_valid, count, limit = validate_answer_word_limit("short", "word " * 50)
    assert is_valid is True
    assert count == 50
    assert limit == 60

    # 2. Answer exactly at the maximum is accepted
    is_valid, count, limit = validate_answer_word_limit("short", "word " * 60)
    assert is_valid is True
    assert count == 60
    assert limit == 60

    # 3. Answer exceeding the maximum by 1 word is rejected
    is_valid, count, limit = validate_answer_word_limit("short", "word " * 61)
    assert is_valid is False
    assert count == 61
    assert limit == 60

    # Long answer boundary check (160 max, 161 rejected)
    is_valid, count, limit = validate_answer_word_limit("long", "word " * 160)
    assert is_valid is True
    assert count == 160

    is_valid, count, limit = validate_answer_word_limit("long", "word " * 161)
    assert is_valid is False
    assert count == 161

    # MCQ unlimited check (e.g. 500 words is valid)
    is_valid, count, limit = validate_answer_word_limit("mcq", "word " * 500)
    assert is_valid is True
    assert limit is None


from backend.api.deps import AuthenticatedUser


def test_over_limit_answer_rejected_before_evaluation():
    """Requirement 8: Over-limit answers are rejected BEFORE Gemini/evaluation is called."""
    conn = get_connection()
    user_row = conn.execute("SELECT user_id FROM study_sets WHERE user_id IS NOT NULL LIMIT 1").fetchone()
    user_id = str(user_row["user_id"]) if user_row and user_row.get("user_id") else None
    conn.close()

    user_obj = AuthenticatedUser(user_id=user_id)

    # Create a Study Set & Attempt
    st_set = study_service.create_study_set("Word Limit Test Set", user_id=user_id)
    set_id = st_set["study_set_id"]

    start_req = StartAttemptRequest(study_set_id=uuid.UUID(set_id))
    att = attempts.start_attempt(payload=start_req, current_user=user_obj)
    attempt_id = str(att.attempt_id)

    # Save a short-answer question in quiz_repository
    qid = f"q_word_{uuid.uuid4().hex[:6]}"
    mock_questions = [
        {
            "question_id": qid,
            "study_set_id": set_id,
            "question_type": "short",
            "topic": "Testing",
            "question": "Explain software testing concisely.",
            "reference_answer": "Software testing verifies software quality.",
            "marks": 10.0
        }
    ]
    quiz_repository.save_questions(study_set_id=set_id, questions=mock_questions)

    over_limit_text = "word " * 65  # 65 words > 60 max limit
    sub_req = SubmitAnswersRequest(
        question_type=QuestionType.SHORT,
        answers=[AnswerItem(question_id=qid, student_answer=over_limit_text)]
    )

    with patch("backend.services.evaluation_service.evaluate_answer") as mock_eval:
        if pytest:
            with pytest.raises(HTTPException) as exc_info:
                attempts.submit_section_answers(attempt_id, payload=sub_req, current_user=user_obj)
            assert exc_info.value.status_code == 400
            assert "maximum allowed word limit of 60 words" in str(exc_info.value.detail)
        else:
            try:
                attempts.submit_section_answers(attempt_id, payload=sub_req, current_user=user_obj)
                assert False, "Should have raised 400 Bad Request"
            except HTTPException as e:
                assert e.status_code == 400
                assert "maximum allowed word limit of 60 words" in str(e.detail)

        # Confirm evaluation function was NEVER called
        mock_eval.assert_not_called()

    # Cleanup
    study_service.delete_study_set(set_id, user_id=user_id)


if __name__ == "__main__":
    init_db()
    print("Running test_word_counting_helper()...")
    test_word_counting_helper()
    print("Running test_word_limit_validation_rules()...")
    test_word_limit_validation_rules()
    print("Running test_over_limit_answer_rejected_before_evaluation()...")
    test_over_limit_answer_rejected_before_evaluation()
    print("\nALL WORD LIMIT TESTS PASSED SUCCESSFULLY!")
