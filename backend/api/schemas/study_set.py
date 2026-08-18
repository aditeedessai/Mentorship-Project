from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class CreateStudySetRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Name of the study set",
        examples=["Machine Learning Fundamentals"]
    )


class StudySetResponse(BaseModel):
    study_set_id: UUID = Field(
        ...,
        description="Unique identifier for the study set (UUID)"
    )
    name: str = Field(
        ...,
        description="Name of the study set"
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp when the study set was created (TIMESTAMPTZ)"
    )
    updated_at: datetime = Field(
        ...,
        description="Timestamp when the study set was last updated (TIMESTAMPTZ)"
    )

    model_config = ConfigDict(from_attributes=True)


class StudySetListResponse(BaseModel):
    study_sets: list[StudySetResponse] = Field(
        default_factory=list,
        description="List of study sets"
    )

    model_config = ConfigDict(from_attributes=True)
