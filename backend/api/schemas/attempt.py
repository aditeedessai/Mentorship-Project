from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class AttemptStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class StartAttemptRequest(BaseModel):
    study_set_id: UUID = Field(
        ...,
        description="ID of the study set for which the quiz attempt is being started (UUID)"
    )
    document_id: UUID | None = Field(
        None,
        description="Optional document ID if starting an attempt for a specific document"
    )
    question_type: Literal["mcq", "application", "long", "short"] = Field(
        ...,
        description=(
            "Which question type to start (or resume) an attempt for - required. "
            "Every attempt is locked to exactly one question type from creation; "
            "there is no study-set-wide attempt spanning all 4. Subject to the "
            "attempt gate (the pair is actually due, and it isn't flagged "
            "needs_attention - see revision_service.is_attempt_allowed_now())."
        )
    )


class AttemptResponse(BaseModel):
    attempt_id: str = Field(
        ...,
        description="Unique identifier for the quiz attempt"
    )
    study_set_id: UUID | None = Field(
        None,
        description="Associated study set UUID"
    )
    document_id: UUID | None = Field(
        None,
        description="Associated document UUID"
    )
    status: AttemptStatus = Field(
        AttemptStatus.IN_PROGRESS,
        description="Status of the quiz attempt (in_progress, completed)"
    )
    question_type: str = Field(
        ...,
        description="The one question type this attempt is locked to."
    )
    total_marks: float = Field(
        0.0,
        ge=0.0,
        description="Total maximum marks available in this attempt"
    )
    marks_awarded: float = Field(
        0.0,
        ge=0.0,
        description="Total marks awarded to the student in this attempt"
    )
    completed_sections: list[str] = Field(
        default_factory=list,
        description="List of completed question-type section names (mcq, short, application, long)"
    )
    remaining_sections: list[str] = Field(
        default_factory=list,
        description="List of remaining uncompleted question-type section names"
    )
    is_attempt_complete: bool = Field(
        False,
        description="True once this attempt's one question-type section has been evaluated"
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp when the attempt was created (TIMESTAMPTZ)"
    )
    updated_at: datetime = Field(
        ...,
        description="Timestamp when the attempt was last updated (TIMESTAMPTZ)"
    )

    model_config = ConfigDict(from_attributes=True)


class AttemptListResponse(BaseModel):
    attempts: list[AttemptResponse] = Field(
        default_factory=list,
        description="List of quiz attempts"
    )

    model_config = ConfigDict(from_attributes=True)
