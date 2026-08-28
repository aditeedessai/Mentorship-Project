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
    user_id: str | None = Field(
        None,
        description="ID of the user who owns the study set"
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


class StudySetProgressResponse(BaseModel):
    study_set_id: UUID = Field(
        ...,
        description="Unique identifier for the study set (UUID)"
    )
    name: str = Field(
        ...,
        description="Name of the study set"
    )
    sections_completed: int = Field(
        ...,
        description="Number of the 4 question-type sections (mcq, application, long, short) with at least one recorded evaluation"
    )
    total_sections: int = Field(
        ...,
        description="Total number of question-type sections (always 4)"
    )

    model_config = ConfigDict(from_attributes=True)


class StudySetProgressListResponse(BaseModel):
    progress: list[StudySetProgressResponse] = Field(
        default_factory=list,
        description="Per-study-set section-completion progress for the authenticated user"
    )

    model_config = ConfigDict(from_attributes=True)


class DeleteStudySetResponse(BaseModel):
    message: str = Field(
        ...,
        description="Confirmation message for study set deletion"
    )
    study_set_id: UUID = Field(
        ...,
        description="Unique identifier of the deleted study set (UUID)"
    )

    model_config = ConfigDict(from_attributes=True)


class SummaryResponse(BaseModel):
    title: str = Field(
        ...,
        description="Short descriptive title for the study material summary"
    )
    overview_paragraphs: list[str] = Field(
        default_factory=list,
        description="Paragraphs summarizing the study material"
    )
    key_topics: list[str] = Field(
        default_factory=list,
        description="Key topics extracted from the study material"
    )

    model_config = ConfigDict(from_attributes=True)


class FlashcardItem(BaseModel):
    term: str = Field(
        ...,
        description="The term, concept, or question for the flashcard"
    )
    definition: str = Field(
        ...,
        description="Clear and concise definition or explanation"
    )

    model_config = ConfigDict(from_attributes=True)


class FlashcardsResponse(BaseModel):
    flashcards: list[FlashcardItem] = Field(
        default_factory=list,
        description="List of generated flashcards"
    )

    model_config = ConfigDict(from_attributes=True)


class MnemonicRequest(BaseModel):
    topic: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="The topic or concept to generate a mnemonic for"
    )
    style: str = Field(
        "acronym",
        description="Mnemonic style: acronym, rhyme, story, or surprise"
    )


class MnemonicResponse(BaseModel):
    title: str = Field(
        ...,
        description="Short descriptive title for the mnemonic"
    )
    mnemonic: str = Field(
        ...,
        description="The main mnemonic phrase, rhyme, or story text"
    )
    style: str = Field(
        ...,
        description="The style used for the mnemonic"
    )
    breakdown: list[str] = Field(
        default_factory=list,
        description="List mapping mnemonic components to concept explanations"
    )

    model_config = ConfigDict(from_attributes=True)
