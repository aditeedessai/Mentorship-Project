from pydantic import BaseModel, ConfigDict, Field
from backend.api.schemas.question import QuestionType


class AnswerItem(BaseModel):
    question_id: str = Field(
        ...,
        description="Unique identifier for the question being answered"
    )
    student_answer: str = Field(
        ...,
        min_length=0,
        description="The student's submitted answer (e.g. 'A' for MCQ, text response for open-ended, or empty string '' for skipped)"
    )


class SubmitAnswersRequest(BaseModel):
    question_type: QuestionType = Field(
        ...,
        description="Question type being submitted (mcq, application, long, short)"
    )
    attempt_id: str | None = Field(
        None,
        description="Optional quiz attempt ID associated with this batch of answers"
    )
    answers: list[AnswerItem] = Field(
        ...,
        min_items=1,
        description="List of student answers for the questions"
    )


class EvaluatePracticeRequest(BaseModel):
    study_set_id: str = Field(
        ...,
        description="Study set ID owning the historical attempt"
    )
    attempt_id: str = Field(
        ...,
        description="Historical attempt ID whose questions are being practice-retaken"
    )
    question_type: QuestionType = Field(
        ...,
        description="Question type being practice-retaken (mcq, application, long, short)"
    )
    answers: list[AnswerItem] = Field(
        ...,
        min_items=1,
        description="List of student answers for the practice retake"
    )


class EvaluationResponse(BaseModel):
    """
    Schema for returning the evaluation results of a student's answer.
    Excludes internal reference answers, correct options, vector embeddings,
    and raw LLM judge prompts.
    """
    question_id: str = Field(
        ...,
        description="Unique identifier for the evaluated question"
    )
    student_answer: str | None = Field(
        None,
        description="The submitted student answer"
    )
    marks_awarded: float = Field(
        ...,
        ge=0.0,
        description="Marks awarded to the student for this answer"
    )
    final_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Normalized score between 0.0 and 1.0"
    )
    is_correct: bool | None = Field(
        None,
        description="Whether the answer is considered correct"
    )
    semantic_score: float | None = Field(
        None,
        description="SBERT semantic similarity score (if applicable for open-ended questions)"
    )
    concept_score: float | None = Field(
        None,
        description="Key concept coverage score (if applicable for open-ended questions)"
    )
    matched_concepts: list[str] | None = Field(
        None,
        description="Key concepts correctly identified in the student's answer"
    )
    missed_concepts: list[str] | None = Field(
        None,
        description="Key concepts missing from the student's answer"
    )
    keyword_stuffing_detected: bool | None = Field(
        None,
        description="Flag indicating if keyword stuffing was detected"
    )
    logic_inversion_detected: bool | None = Field(
        None,
        description="Flag indicating if logic inversion or contradiction was detected"
    )
    question_text: str | None = Field(
        None,
        description="Prompt text of the evaluated question"
    )
    question_type: str | None = Field(
        None,
        description="Type of question (mcq, short, application, long)"
    )
    correct_answer: str | None = Field(
        None,
        description="Correct option or reference solution"
    )
    max_marks: float | None = Field(
        None,
        ge=0.0,
        description="Maximum possible marks for this question"
    )
    feedback: str | None = Field(
        None,
        description="Evaluation summary or feedback string"
    )
    topic: str | None = Field(
        None,
        description="Topic name associated with the evaluated question"
    )

    model_config = ConfigDict(from_attributes=True)


class EvaluationListResponse(BaseModel):
    attempt_id: str | None = Field(
        None,
        description="Associated quiz attempt ID"
    )
    total_marks: float = Field(
        0.0,
        description="Total possible marks for evaluated questions"
    )
    earned_marks: float = Field(
        0.0,
        description="Total earned marks across evaluated questions"
    )
    percentage: float = Field(
        0.0,
        description="Overall score percentage"
    )
    results: list[EvaluationResponse] = Field(
        default_factory=list,
        description="List of individual question evaluation results"
    )

    model_config = ConfigDict(from_attributes=True)
