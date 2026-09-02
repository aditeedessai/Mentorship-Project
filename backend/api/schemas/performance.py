from pydantic import BaseModel, ConfigDict, Field
from backend.api.schemas.attempt import AttemptStatus


class SectionPerformance(BaseModel):
    """
    Performance rollup for a single completed question-type section
    (e.g., MCQ, Application, Long, Short).
    """
    section_name: str = Field(
        ...,
        description="Name of the question-type section (e.g. 'mcq', 'application', 'long', 'short')"
    )
    marks_obtained: float = Field(
        ...,
        ge=0.0,
        description="Total marks awarded to the student in this section"
    )
    maximum_marks: float = Field(
        ...,
        ge=0.0,
        description="Total maximum possible marks in this section"
    )
    percentage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Percentage score achieved in this section"
    )
    remark: str = Field(
        ...,
        description="Plain-English qualitative remark (e.g., 'Excellent', 'Very Good', 'Needs Improvement')"
    )

    model_config = ConfigDict(from_attributes=True)


class TopicPerformance(BaseModel):
    """
    Performance breakdown for a specific study topic across completed questions.
    """
    topic_name: str = Field(
        ...,
        description="Topic category name (e.g. 'supervised_learning', 'general')"
    )
    marks_obtained: float = Field(
        ...,
        ge=0.0,
        description="Total marks awarded for questions under this topic"
    )
    maximum_marks: float = Field(
        ...,
        ge=0.0,
        description="Total maximum possible marks under this topic"
    )
    percentage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Percentage score achieved for this topic"
    )
    remark: str = Field(
        ...,
        description="Plain-English qualitative remark for this topic"
    )

    model_config = ConfigDict(from_attributes=True)


class CumulativePerformance(BaseModel):
    """
    Overall cumulative performance metrics across all completed sections.
    """
    total_marks_obtained: float = Field(
        ...,
        ge=0.0,
        description="Overall total marks awarded across all completed sections"
    )
    total_maximum_marks: float = Field(
        ...,
        ge=0.0,
        description="Overall total maximum marks available across all completed sections"
    )
    overall_percentage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Overall percentage score across completed sections"
    )
    overall_remark: str = Field(
        ...,
        description="Overall qualitative performance remark"
    )
    strongest_section: str | None = Field(
        None,
        description="Name of the highest-scoring completed section (None if fewer than 2 completed sections)"
    )
    weakest_section: str | None = Field(
        None,
        description="Name of the lowest-scoring completed section (None if fewer than 2 completed sections)"
    )

    model_config = ConfigDict(from_attributes=True)


class PerformanceResponse(BaseModel):
    """
    Response schema for retrieving current performance during an ongoing quiz attempt.
    Includes only completed question-type sections.
    """
    attempt_id: str = Field(
        ...,
        description="Unique identifier for the quiz attempt"
    )
    status: AttemptStatus = Field(
        AttemptStatus.IN_PROGRESS,
        description="Status of the quiz attempt ('in_progress' or 'completed')"
    )
    question_type: str | None = Field(
        None,
        description="The one question type this attempt is locked to."
    )
    completed_sections: list[str] = Field(
        default_factory=list,
        description="List of completed section names"
    )
    remaining_sections: list[str] = Field(
        default_factory=list,
        description="List of remaining uncompleted section names"
    )
    is_attempt_complete: bool = Field(
        False,
        description="Whether all 4 mandatory sections are completed"
    )
    sections: list[SectionPerformance] = Field(
        default_factory=list,
        description="Performance metrics for completed question-type sections"
    )
    cumulative: CumulativePerformance = Field(
        ...,
        description="Overall cumulative performance summary across completed sections"
    )
    topics: list[TopicPerformance] = Field(
        default_factory=list,
        description="Topic-level performance breakdown"
    )

    model_config = ConfigDict(from_attributes=True)


class ResultResponse(BaseModel):
    """
    Response schema for representing final test results upon attempt completion.
    """
    attempt_id: str = Field(
        ...,
        description="Unique identifier for the quiz attempt"
    )
    status: AttemptStatus = Field(
        AttemptStatus.COMPLETED,
        description="Final attempt status ('in_progress' or 'completed')"
    )
    question_type: str | None = Field(
        None,
        description="The one question type this attempt is locked to."
    )
    completed_sections: list[str] = Field(
        default_factory=list,
        description="List of completed section names"
    )
    remaining_sections: list[str] = Field(
        default_factory=list,
        description="List of remaining uncompleted section names"
    )
    is_attempt_complete: bool = Field(
        False,
        description="Whether all 4 mandatory sections are completed"
    )
    cumulative: CumulativePerformance = Field(
        ...,
        description="Overall cumulative performance summary"
    )
    sections: list[SectionPerformance] = Field(
        default_factory=list,
        description="Section-by-section performance breakdown"
    )
    topics: list[TopicPerformance] = Field(
        default_factory=list,
        description="Topic-by-topic performance breakdown"
    )

    model_config = ConfigDict(from_attributes=True)
