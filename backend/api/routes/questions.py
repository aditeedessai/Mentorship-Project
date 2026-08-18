from datetime import datetime, timezone
import uuid
from uuid import UUID
from fastapi import APIRouter, Query, status

try:
    from api.schemas.question import (
        GenerateQuestionsRequest,
        QuestionListResponse,
        QuestionResponse,
        QuestionType,
    )
except ModuleNotFoundError:
    from backend.api.schemas.question import (
        GenerateQuestionsRequest,
        QuestionListResponse,
        QuestionResponse,
        QuestionType,
    )

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
    now = datetime.now(timezone.utc)

    if payload.question_type == QuestionType.MCQ:
        placeholder_question = QuestionResponse(
            question_id=str(uuid.uuid4()),
            study_set_id=study_set_id,
            document_id=None,
            question_type=QuestionType.MCQ,
            topic="general",
            question="What is the primary function of a neural network activation function?",
            options={
                "A": "Introduce non-linearity into the model",
                "B": "Reduce dataset dimensionality",
                "C": "Increase learning rate",
                "D": "Normalize input features"
            },
            marks=2.0,
            created_at=now
        )
    else:
        placeholder_question = QuestionResponse(
            question_id=str(uuid.uuid4()),
            study_set_id=study_set_id,
            document_id=None,
            question_type=payload.question_type,
            topic="general",
            question=f"Sample {payload.question_type.value} question about the study material.",
            options=None,
            marks=10.0,
            created_at=now
        )

    return QuestionListResponse(questions=[placeholder_question])


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
    now = datetime.now(timezone.utc)
    target_type = question_type or QuestionType.MCQ

    placeholder_question = QuestionResponse(
        question_id=str(uuid.UUID("00000000-0000-4000-8000-000000000003")),
        study_set_id=study_set_id,
        document_id=None,
        question_type=target_type,
        topic="general",
        question="Sample study question?",
        options={"A": "Option A", "B": "Option B"} if target_type == QuestionType.MCQ else None,
        marks=2.0 if target_type == QuestionType.MCQ else 10.0,
        created_at=now
    )

    return QuestionListResponse(questions=[placeholder_question])


@router.get(
    "/questions/{question_id}",
    response_model=QuestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get question details by ID",
    description="Retrieves student-facing details for a specific question by its ID."
)
def get_question(question_id: str) -> QuestionResponse:
    now = datetime.now(timezone.utc)
    return QuestionResponse(
        question_id=question_id,
        study_set_id=uuid.UUID("00000000-0000-4000-8000-000000000001"),
        document_id=None,
        question_type=QuestionType.MCQ,
        topic="general",
        question="What is supervised learning?",
        options={
            "A": "Learning with labeled data",
            "B": "Learning without labeled data",
            "C": "Reinforcement learning",
            "D": "Unsupervised clustering"
        },
        marks=2.0,
        created_at=now
    )
