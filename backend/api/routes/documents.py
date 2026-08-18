from datetime import datetime, timezone
from pathlib import Path
import uuid
from uuid import UUID
from fastapi import APIRouter, File, HTTPException, UploadFile, status

try:
    from api.schemas.document import (
        DocumentListResponse,
        DocumentResponse,
    )
except ModuleNotFoundError:
    from backend.api.schemas.document import (
        DocumentListResponse,
        DocumentResponse,
    )

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx"}

router = APIRouter(tags=["Documents"])


@router.post(
    "/study-sets/{study_set_id}/documents",
    response_model=DocumentListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload document(s) to a study set",
    description="Uploads one or more documents (PDF, DOCX, PPTX) to an existing study set."
)
def upload_documents(
    study_set_id: UUID,
    files: list[UploadFile] = File(...)
) -> DocumentListResponse:
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file must be provided for upload."
        )

    now = datetime.now(timezone.utc)
    uploaded_docs = []

    for file in files:
        file_ext = Path(file.filename or "").suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{file_ext}'. Allowed formats: .pdf, .docx, .pptx"
            )

        placeholder_doc = DocumentResponse(
            document_id=uuid.uuid4(),
            study_set_id=study_set_id,
            file_name=file.filename or "uploaded_document",
            file_path=f"/uploads/{file.filename or 'uploaded_document'}",
            created_at=now
        )
        uploaded_docs.append(placeholder_doc)

    return DocumentListResponse(documents=uploaded_docs)


@router.get(
    "/study-sets/{study_set_id}/documents",
    response_model=DocumentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List documents in a study set",
    description="Retrieves all documents associated with the specified study set UUID."
)
def list_study_set_documents(study_set_id: UUID) -> DocumentListResponse:
    now = datetime.now(timezone.utc)
    placeholder_doc = DocumentResponse(
        document_id=uuid.UUID("00000000-0000-4000-8000-000000000002"),
        study_set_id=study_set_id,
        file_name="sample_lecture.pdf",
        file_path="/uploads/sample_lecture.pdf",
        created_at=now
    )
    return DocumentListResponse(documents=[placeholder_doc])


@router.get(
    "/documents/{document_id}",
    response_model=DocumentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get document details by ID",
    description="Retrieves information for a specific document by its UUID."
)
def get_document(document_id: UUID) -> DocumentResponse:
    now = datetime.now(timezone.utc)
    return DocumentResponse(
        document_id=document_id,
        study_set_id=uuid.UUID("00000000-0000-4000-8000-000000000001"),
        file_name="sample_lecture.pdf",
        file_path="/uploads/sample_lecture.pdf",
        created_at=now
    )
