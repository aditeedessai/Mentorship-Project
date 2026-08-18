from datetime import datetime
from enum import Enum
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class QuestionType(str, Enum):
    MCQ = "mcq"
    APPLICATION = "application"
    LONG = "long"
    SHORT = "short"


class GenerateQuestionsRequest(BaseModel):
    question_type: QuestionType = Field(
        ...,
        description="Type of question to generate (mcq, application, long, short)",
        examples=["mcq"]
    )
    study_set_id: UUID | None = Field(
        None,
        description="Optional study set UUID to generate quiz from"
    )
    document_id: UUID | None = Field(
        None,
        description="Optional document UUID to generate quiz from"
    )


class QuestionResponse(BaseModel):
    """
    Schema for presenting a question to the student/frontend.
    Intentionally excludes reference answers, correct options, evaluation metrics,
    and internal RAG source chunk metadata.
    """
    question_id: str = Field(
        ...,
        description="Unique identifier for the question"
    )
    study_set_id: UUID | None = Field(
        None,
        description="ID of the associated study set (UUID)"
    )
    document_id: UUID | None = Field(
        None,
        description="ID of the associated primary document (UUID)"
    )
    question_type: QuestionType = Field(
        ...,
        description="Type of question (mcq, application, long, short)"
    )
    topic: str | None = Field(
        "general",
        description="Topic or category of the question"
    )
    question: str = Field(
        ...,
        description="The question text to display to the student"
    )
    options: dict[str, str] | list[str] | None = Field(
        None,
        description="Multiple-choice options for MCQ questions (e.g. {'A': '...', 'B': '...'})"
    )
    marks: float = Field(
        10.0,
        description="Maximum marks allocated for this question"
    )
    created_at: datetime | None = Field(
        None,
        description="Timestamp when the question was created (TIMESTAMPTZ)"
    )

    model_config = ConfigDict(from_attributes=True)


class QuestionListResponse(BaseModel):
    questions: list[QuestionResponse] = Field(
        default_factory=list,
        description="List of questions for the quiz/attempt"
    )

    model_config = ConfigDict(from_attributes=True)
