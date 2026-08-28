from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class CreateExamRequest(BaseModel):
    subject: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Subject or name of the exam",
        examples=["Calculus II"]
    )
    exam_type: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Type of exam",
        examples=["Midterm"]
    )
    exam_date: date = Field(
        ...,
        description="Date the exam takes place"
    )
    study_set_id: UUID | None = Field(
        None,
        description="Optional study set this exam is linked to"
    )


class ExamResponse(BaseModel):
    id: UUID = Field(
        ...,
        description="Unique identifier for the exam (UUID)"
    )
    user_id: str = Field(
        ...,
        description="ID of the user who owns the exam"
    )
    study_set_id: UUID | None = Field(
        None,
        description="Study set this exam is linked to, if any"
    )
    subject: str = Field(
        ...,
        description="Subject or name of the exam"
    )
    exam_type: str = Field(
        ...,
        description="Type of exam"
    )
    exam_date: date = Field(
        ...,
        description="Date the exam takes place"
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp when the exam was created (TIMESTAMPTZ)"
    )
    updated_at: datetime = Field(
        ...,
        description="Timestamp when the exam was last updated (TIMESTAMPTZ)"
    )

    model_config = ConfigDict(from_attributes=True)


class ExamListResponse(BaseModel):
    exams: list[ExamResponse] = Field(
        default_factory=list,
        description="List of exams, nearest first"
    )

    model_config = ConfigDict(from_attributes=True)


class DeleteExamResponse(BaseModel):
    message: str = Field(
        ...,
        description="Confirmation message for exam deletion"
    )
    exam_id: UUID = Field(
        ...,
        description="Unique identifier of the deleted exam (UUID)"
    )

    model_config = ConfigDict(from_attributes=True)
