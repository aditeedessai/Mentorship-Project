from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class DocumentResponse(BaseModel):
    document_id: UUID = Field(
        ...,
        description="Unique identifier for the document (UUID)"
    )
    study_set_id: UUID = Field(
        ...,
        description="Unique identifier of the associated study set (UUID)"
    )
    file_name: str = Field(
        ...,
        description="Original name of the uploaded document file"
    )
    file_path: str = Field(
        ...,
        description="Storage path or location of the document file"
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp when the document was created (TIMESTAMPTZ)"
    )

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse] = Field(
        default_factory=list,
        description="List of documents"
    )

    model_config = ConfigDict(from_attributes=True)


class SummaryResponse(BaseModel):
    """
    Schema for a quick, orientation-level summary of a document's study
    material. Generated fresh via Gemini on each request; not persisted.
    """
    title: str = Field(
        ...,
        description="Short descriptive title for the study material"
    )
    overview_paragraphs: list[str] = Field(
        ...,
        description="2 to 5 short paragraphs giving a quick overview of the material, one distinct angle per paragraph"
    )
    key_topics: list[str] = Field(
        default_factory=list,
        description="Short list of key topics covered in the material"
    )

    model_config = ConfigDict(from_attributes=True)
