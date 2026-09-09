from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class AttemptProgressItem(BaseModel):
    """
    Performance percentages for a single attempt number across question types.
    """
    attempt_number: int = Field(
        ...,
        ge=1,
        le=4,
        description="Attempt index sequence (1, 2, 3, or 4)"
    )
    created_at: datetime | str | None = Field(
        None,
        description="Timestamp of the attempt"
    )
    by_type: dict[str, float] = Field(
        default_factory=dict,
        description="Map of question_type ('mcq', 'short', 'application', 'long') to percentage score (0.0 to 100.0)"
    )

    model_config = ConfigDict(from_attributes=True)


class ProgressHistoryResponse(BaseModel):
    """
    Response schema for GET /api/progress/history?study_set_id=...
    Contains attempt history across the 4 question types for a single study set.
    """
    study_set_id: str = Field(
        ...,
        description="UUID of the selected study set"
    )
    attempts: list[AttemptProgressItem] = Field(
        default_factory=list,
        description="List of chronological completed attempt points (Attempt 1 to Attempt 4)"
    )
    available_question_types: list[str] = Field(
        default_factory=list,
        description="List of question types ('mcq', 'short', 'application', 'long') that have completed attempt data"
    )

    model_config = ConfigDict(from_attributes=True)
