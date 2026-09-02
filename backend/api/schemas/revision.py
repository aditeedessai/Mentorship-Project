from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class RevisionStatusItem(BaseModel):
    """
    Attempt status for one (study_set, question_type) pair - what
    StudySetQuestionProgressCard reads to decide whether to show a
    "Start" / "Review Weak Areas" state for that type, and what
    start_attempt()'s gate (backend/services/revision_service.py's
    is_attempt_allowed_now()) checks before allowing an attempt to
    actually start. Every type is independently scheduled from its very
    first attempt - there is no separate "initial" pass gating this.
    """
    question_type: str = Field(
        ...,
        description="Question type this status is for ('mcq', 'application', 'long', 'short')"
    )
    available: bool = Field(
        ...,
        description="Whether an attempt for this type can be started right now"
    )
    reason: str | None = Field(
        None,
        description=(
            "Why an attempt isn't available yet, when available=False: "
            "'attempts_exhausted' (the 4-attempt cap was reached and the "
            "last attempt cleared 50%), 'needs_attention' (the cap was "
            "reached and the last attempt was still below 50%), or "
            "'not_yet_due' (still waiting out the scheduled gap). None "
            "when available=True - including a type that's never been "
            "attempted before, which is always immediately available."
        )
    )
    next_due_date: date | None = Field(
        None,
        description="The date the next attempt becomes due (None if never available again)"
    )
    attempts_taken: int = Field(
        0,
        ge=0,
        le=4,
        description="How many attempts have been taken for this pair so far (max 4)"
    )
    needs_attention: bool = Field(
        False,
        description="True if the 4-attempt cap was reached while accuracy was still below 50%"
    )
    last_accuracy: float | None = Field(
        None,
        description="Accuracy percentage (0-100) from the most recent revision attempt, if any"
    )

    model_config = ConfigDict(from_attributes=True)


class RevisionStatusListResponse(BaseModel):
    """Response schema for GET /study-sets/{study_set_id}/revision-status."""
    study_set_id: str = Field(
        ...,
        description="Study set these revision statuses belong to"
    )
    statuses: list[RevisionStatusItem] = Field(
        default_factory=list,
        description="Revision status for each of the 4 question types"
    )

    model_config = ConfigDict(from_attributes=True)
