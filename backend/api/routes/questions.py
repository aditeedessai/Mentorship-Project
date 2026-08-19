from datetime import datetime, timezone
import uuid
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, status

try:
    from api.schemas.question import (
        GenerateQuestionsRequest,
        QuestionListResponse,
        QuestionResponse,
        QuestionType,
    )
    from mock_data.questions import MOCK_QUESTIONS
except ModuleNotFoundError:
    from backend.api.schemas.question import (
        GenerateQuestionsRequest,
        QuestionListResponse,
        QuestionResponse,
        QuestionType,
    )
    from backend.mock_data.questions import MOCK_QUESTIONS

router = APIRouter(tags=["Questions"])


@router.post(
    "/study-sets/{study_set_id}/questions/generate",
    response_model=QuestionListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate questions for a study set",
    description="Generates questions of a specified type (mcq, application, long, short) for a given study set."
)
def generate_questions(
    study_set_id: UUID,
    payload: GenerateQuestionsRequest
) -> QuestionListResponse:
    matching_questions = [
        q for q in MOCK_QUESTIONS
        if q.question_type == payload.question_type and (q.study_set_id == study_set_id or q.study_set_id is None)
    ]
    if not matching_questions:
        matching_questions = [
            q for q in MOCK_QUESTIONS
            if q.question_type == payload.question_type
        ]
    return QuestionListResponse(questions=matching_questions)


@router.get(
    "/study-sets/{study_set_id}/questions",
    response_model=QuestionListResponse,
    status_code=status.HTTP_200_OK,
    summary="List questions in a study set",
    description="Retrieves generated questions for a study set, optionally filtered by question type."
)
def list_questions(
    study_set_id: UUID,
    question_type: QuestionType | None = Query(
        None,
        description="Optional filter by question type (mcq, application, long, short)"
    )
) -> QuestionListResponse:
    matching_questions = [
        q for q in MOCK_QUESTIONS
        if q.study_set_id == study_set_id or q.study_set_id is None
    ]
    if question_type:
        matching_questions = [
            q for q in matching_questions
            if q.question_type == question_type
        ]
    if not matching_questions:
        matching_questions = [
            q for q in MOCK_QUESTIONS
            if (question_type is None or q.question_type == question_type)
        ]
    return QuestionListResponse(questions=matching_questions)


@router.get(
    "/questions/{question_id}",
    response_model=QuestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get question details by ID",
    description="Retrieves student-facing details for a specific question by its ID."
)
def get_question(question_id: str) -> QuestionResponse:
    for question in MOCK_QUESTIONS:
        if question.question_id == question_id:
            return question
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Question with ID '{question_id}' not found"
    )

