import uuid
from unittest.mock import patch, MagicMock

import pytest

from backend.database.study_set_repository import create_study_set, create_document
from backend.database.attempt_repository import save_attempt, get_attempt
from backend.database.evaluation_repository import save_evaluation
from backend.database.quiz_repository import (
    save_questions,
    get_questions_by_study_set,
    get_recent_question_texts_for_study_set,
)
from backend.database.revision_repository import record_attempt_result, get_schedule
from backend.services.revision_service import (
    get_latest_completed_attempt,
    get_latest_completed_attempt_weak_topics,
    is_attempt_allowed_now,
)
from backend.quiz_generation.prompt_builder import build_quiz_prompt
from backend.quiz_generation.quiz_generator import generate_quiz
from backend.answer_evaluation.topic_scorer import aggregate_topic_scores, WEAK_TOPIC_THRESHOLD


def _create_mock_study_set(user_id: str = None):
    study_set_id = str(uuid.uuid4())
    create_study_set(study_set_id=study_set_id, name="Test Study Set", user_id=None)
    doc_id = str(uuid.uuid4())
    create_document(document_id=doc_id, study_set_id=study_set_id, file_path="/tmp/test.pdf", file_name="test.pdf")
    return study_set_id, doc_id


def _create_mock_attempt(study_set_id: str, question_type: str, user_id: str = None, status: str = "completed", doc_id: str = None):
    att_id = str(uuid.uuid4())
    save_attempt(
        attempt_id=att_id,
        question_type=question_type,
        total_marks=20.0,
        marks_awarded=10.0,
        study_set_id=study_set_id,
        document_id=doc_id,
        status=status,
        user_id=user_id,
    )
    return att_id


def _create_mock_chunk(document_id: str, study_set_id: str, text: str = "Sample content"):
    from backend.database.database import get_connection
    chunk_id = str(uuid.uuid4())
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO document_chunks (chunk_id, document_id, study_set_id, chunk_number, content)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (chunk_id, document_id, study_set_id, 1, text)
        )
        conn.commit()
    finally:
        conn.close()
    return {
        "id": chunk_id,
        "text": text,
        "document_id": document_id,
        "study_set_id": study_set_id,
        "chunk_number": 1,
    }


def _create_mock_question_and_eval(
    attempt_id: str,
    study_set_id: str,
    question_type: str,
    topic: str,
    marks_awarded: float,
    max_marks: float = 10.0,
    q_text: str = "Sample question text?",
    doc_id: str = None
):
    q_id = str(uuid.uuid4())
    question = {
        "question_id": q_id,
        "question_type": question_type,
        "topic": topic,
        "question": q_text,
        "reference_answer": "Sample reference answer.",
        "marks": max_marks,
        "document_id": doc_id,
        "source_document_ids": [doc_id] if doc_id else [],
        "source_chunk_ids": [],
    }
    save_questions(study_set_id=study_set_id, questions=[question], attempt_id=attempt_id)

    eval_data = {
        "semantic_score": marks_awarded / max_marks,
        "concept_score": marks_awarded / max_marks,
        "final_score": marks_awarded / max_marks,
        "marks_awarded": marks_awarded,
        "matched_concepts": ["concept1"],
        "missed_concepts": [] if marks_awarded >= max_marks * 0.55 else ["concept2"],
    }
    save_evaluation(
        question_id=q_id,
        student_answer="Sample student answer",
        evaluation=eval_data,
        attempt_id=attempt_id,
    )
    return q_id


def test_latest_completed_attempt_selection():
    """Verify that get_latest_completed_attempt selects the latest completed attempt for (study_set_id, question_type)."""
    study_set_id, doc_id = _create_mock_study_set()
    q_type = "short"

    # Completed Attempt 1
    att1 = _create_mock_attempt(study_set_id, q_type, status="completed", doc_id=doc_id)

    # In-progress Attempt 2 (should be ignored by latest completed lookup)
    att2_in_progress = _create_mock_attempt(study_set_id, q_type, status="in_progress", doc_id=doc_id)

    latest = get_latest_completed_attempt(study_set_id, q_type)
    assert latest is not None
    assert latest["attempt_id"] == att1

    # Now complete Attempt 2
    save_attempt(attempt_id=att2_in_progress, question_type=q_type, total_marks=20.0, marks_awarded=16.0, study_set_id=study_set_id, document_id=doc_id, status="completed")

    latest2 = get_latest_completed_attempt(study_set_id, q_type)
    assert latest2 is not None
    assert latest2["attempt_id"] == att2_in_progress


def test_weak_topic_calculation_from_gemini_topics():
    """Verify get_latest_completed_attempt_weak_topics calculates topic percentage using questions.topic and evaluations."""
    study_set_id, doc_id = _create_mock_study_set()
    q_type = "short"

    att_id = _create_mock_attempt(study_set_id, q_type, status="completed", doc_id=doc_id)

    # Genetics: 3 / 10 = 30% (Weak)
    _create_mock_question_and_eval(att_id, study_set_id, q_type, topic="Genetics", marks_awarded=3.0, max_marks=10.0, doc_id=doc_id)
    # Cell Biology: 9 / 10 = 90% (Strong)
    _create_mock_question_and_eval(att_id, study_set_id, q_type, topic="Cell Biology", marks_awarded=9.0, max_marks=10.0, doc_id=doc_id)

    weak_topics = get_latest_completed_attempt_weak_topics(study_set_id, q_type)
    assert "Genetics" in weak_topics
    assert "Cell Biology" not in weak_topics


def test_weak_topic_threshold():
    """Verify weak topics are identified using WEAK_TOPIC_THRESHOLD (51.0%)."""
    study_set_id, doc_id = _create_mock_study_set()
    q_type = "short"

    att_id = _create_mock_attempt(study_set_id, q_type, status="completed", doc_id=doc_id)

    # Topic A: 50.0% -> Weak (< 51.0)
    _create_mock_question_and_eval(att_id, study_set_id, q_type, topic="Topic A", marks_awarded=5.0, max_marks=10.0, doc_id=doc_id)
    # Topic B: 60.0% -> Strong (>= 51.0)
    _create_mock_question_and_eval(att_id, study_set_id, q_type, topic="Topic B", marks_awarded=6.0, max_marks=10.0, doc_id=doc_id)

    weak_topics = get_latest_completed_attempt_weak_topics(study_set_id, q_type)
    assert weak_topics == ["Topic A"]


def test_weakest_topics_prioritization():
    """Verify weak topics are ordered from lowest percentage to highest."""
    study_set_id, doc_id = _create_mock_study_set()
    q_type = "short"

    att_id = _create_mock_attempt(study_set_id, q_type, status="completed", doc_id=doc_id)

    # Topic A: 40%
    _create_mock_question_and_eval(att_id, study_set_id, q_type, topic="Topic A", marks_awarded=4.0, max_marks=10.0, doc_id=doc_id)
    # Topic B: 20%
    _create_mock_question_and_eval(att_id, study_set_id, q_type, topic="Topic B", marks_awarded=2.0, max_marks=10.0, doc_id=doc_id)

    weak_topics = get_latest_completed_attempt_weak_topics(study_set_id, q_type)
    assert weak_topics == ["Topic B", "Topic A"]  # Topic B (20%) before Topic A (40%)


def test_improved_topic_removal():
    """Verify that if Genetics was weak in Attempt 1 (40%) but improved in Attempt 2 (80%), Attempt 3 no longer targets Genetics."""
    study_set_id, doc_id = _create_mock_study_set()
    q_type = "short"

    # Attempt 1: Genetics = 40% (Weak)
    att1 = _create_mock_attempt(study_set_id, q_type, status="completed", doc_id=doc_id)
    _create_mock_question_and_eval(att1, study_set_id, q_type, topic="Genetics", marks_awarded=4.0, max_marks=10.0, doc_id=doc_id)

    weak_att1 = get_latest_completed_attempt_weak_topics(study_set_id, q_type)
    assert weak_att1 == ["Genetics"]

    # Attempt 2: Genetics = 80% (Strong)
    att2 = _create_mock_attempt(study_set_id, q_type, status="completed", doc_id=doc_id)
    _create_mock_question_and_eval(att2, study_set_id, q_type, topic="Genetics", marks_awarded=8.0, max_marks=10.0, doc_id=doc_id)

    # Attempt 3 check: Should use Attempt 2 (Genetics=80%), so zero weak topics!
    weak_att2 = get_latest_completed_attempt_weak_topics(study_set_id, q_type)
    assert weak_att2 == []


def test_multiple_weak_topics_handling():
    """Verify handling of multiple weak topics distribution."""
    study_set_id, doc_id = _create_mock_study_set()
    q_type = "short"

    att_id = _create_mock_attempt(study_set_id, q_type, status="completed", doc_id=doc_id)
    _create_mock_question_and_eval(att_id, study_set_id, q_type, topic="Topic 1", marks_awarded=1.0, max_marks=10.0, doc_id=doc_id)
    _create_mock_question_and_eval(att_id, study_set_id, q_type, topic="Topic 2", marks_awarded=2.0, max_marks=10.0, doc_id=doc_id)
    _create_mock_question_and_eval(att_id, study_set_id, q_type, topic="Topic 3", marks_awarded=3.0, max_marks=10.0, doc_id=doc_id)

    weak_topics = get_latest_completed_attempt_weak_topics(study_set_id, q_type)
    assert len(weak_topics) == 3
    assert weak_topics == ["Topic 1", "Topic 2", "Topic 3"]


def test_prompt_builder_adaptive_blocks():
    """Verify build_quiz_prompt includes adaptive targets, topic consistency rules, and duplicate prevention."""
    text = "Photosynthesis occurs in chloroplasts. Genetics involves DNA."
    weak_topics = ["Genetics", "Photosynthesis"]
    topic_allocations = {"Genetics": 2, "Photosynthesis": 2, "__general__": 1}
    previous_questions = ["What is photosynthesis?", "Define DNA."]

    prompt = build_quiz_prompt(
        text,
        question_type="short",
        weak_topics=weak_topics,
        topic_allocations=topic_allocations,
        previous_questions=previous_questions,
    )

    assert "ADAPTIVE REVISION TARGETS:" in prompt
    assert "Weak Topic 'Genetics': generate exactly 2 question(s)" in prompt
    assert "STRICT TOPIC CONSISTENCY RULE:" in prompt
    assert "FRESH QUESTION REQUIREMENT (PREVENT DUPLICATES):" in prompt
    assert "- What is photosynthesis?" in prompt


@patch("backend.quiz_generation.quiz_generator.client")
@patch("backend.quiz_generation.quiz_generator.retrieve_chunks")
def test_generate_quiz_adaptive_flow(mock_retrieve_chunks, mock_client):
    """Verify generate_quiz performs weak-topic retrieval, passes adaptive options, and tags new attempt_id."""
    study_set_id, doc_id = _create_mock_study_set()
    q_type = "short"
    new_attempt_id = _create_mock_attempt(study_set_id, q_type, status="in_progress", doc_id=doc_id)

    # Create previous attempt with weak topic
    prev_att = _create_mock_attempt(study_set_id, q_type, status="completed", doc_id=doc_id)
    _create_mock_question_and_eval(prev_att, study_set_id, q_type, topic="Mendelian Genetics", marks_awarded=2.0, max_marks=10.0, q_text="What is a gene?", doc_id=doc_id)

    # Mock chunk retrieval
    mock_chunk = _create_mock_chunk(doc_id, study_set_id, text="Mendelian genetics involves dominant and recessive alleles.")
    mock_retrieve_chunks.return_value = [mock_chunk]

    # Mock Gemini response
    gemini_json = {
        "questions": [
            {
                "question_id": "q1",
                "question_type": "short",
                "topic": "Mendelian Genetics",
                "question": "Explain dominant vs recessive alleles.",
                "reference_answer": "Dominant alleles express over recessive ones."
            }
        ]
    }
    mock_response = MagicMock()
    mock_response.text = f"```json\n{json_dumps(gemini_json)}\n```"
    mock_client.models.generate_content.return_value = mock_response

    res = generate_quiz(study_set_id=study_set_id, question_type=q_type, attempt_id=new_attempt_id)

    assert "questions" in res
    assert len(res["questions"]) == 1
    generated_q = res["questions"][0]

    # Topic consistency preserved
    assert generated_q["topic"] == "Mendelian Genetics"

    # Attempt isolation: questions in DB tagged with new_attempt_id
    db_questions = get_questions_by_study_set(study_set_id, attempt_id=new_attempt_id)
    assert len(db_questions) == 1
    assert db_questions[0]["question_id"] == generated_q["question_id"]

    # Source traceability: source_document_ids attached
    assert generated_q["source_document_ids"] == [doc_id]


def test_recent_questions_duplicate_prevention_retrieval():
    """Verify get_recent_question_texts_for_study_set retrieves previous question texts."""
    study_set_id, doc_id = _create_mock_study_set()
    att_id = _create_mock_attempt(study_set_id, "short", doc_id=doc_id)

    _create_mock_question_and_eval(att_id, study_set_id, "short", "Topic1", 5.0, 10.0, q_text="Question 1?", doc_id=doc_id)
    _create_mock_question_and_eval(att_id, study_set_id, "short", "Topic2", 5.0, 10.0, q_text="Question 2?", doc_id=doc_id)

    recent = get_recent_question_texts_for_study_set(study_set_id, question_type="short")
    assert "Question 1?" in recent
    assert "Question 2?" in recent


def test_revision_scheduling_and_locking_intact():
    """Verify is_attempt_allowed_now and revision schedule rules continue to function unchanged."""
    study_set_id, _ = _create_mock_study_set()
    q_type = "short"

    # First attempt is always allowed (without existing schedule)
    allowed, reason = is_attempt_allowed_now(study_set_id, q_type, user_id=None)
    assert allowed is True
    assert reason is None


def json_dumps(obj):
    import json
    return json.dumps(obj)
