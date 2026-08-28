from pydantic import BaseModel, ConfigDict, Field


class StudiedDaysResponse(BaseModel):
    year: int = Field(
        ...,
        description="Calendar year the studied days were requested for"
    )
    month: int = Field(
        ...,
        description="Calendar month the studied days were requested for (1-12)"
    )
    studied_days: list[int] = Field(
        default_factory=list,
        description="Day-of-month numbers (1-31) on which the user answered at least one question"
    )

    model_config = ConfigDict(from_attributes=True)
