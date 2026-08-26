from pathlib import Path
import tempfile
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    SummaryResponse,
)
from backend.database import study_set_repository
from backend.quiz_generation.summary_generator import generate_summary
from backend.services import document_service

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
    files: list[UploadFile] = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> DocumentListResponse:
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file must be provided for upload."
        )

    # 1. Verify study set exists and belongs to current_user.user_id
    study_set = study_set_repository.get_study_set(str(study_set_id), user_id=current_user.user_id)
    if not study_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study set with ID '{study_set_id}' not found"
        )

    # 2. Validate file extensions
    for file in files:
        file_ext = Path(file.filename or "").suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{file_ext}'. Allowed formats: .pdf, .docx, .pptx"
            )

    uploaded_docs = []

    # 3. Save files temporarily and process through document_service
    with tempfile.TemporaryDirectory() as temp_dir:
        for file in files:
            orig_name = file.filename or "uploaded_document"
            temp_file_path = Path(temp_dir) / orig_name

            try:
                with open(temp_file_path, "wb") as f:
                    content = file.file.read()
                    f.write(content)

                # Process PDF/DOCX/PPTX: text extraction, cleaning, chunking, metadata insertion, SBERT embedding generation & pgvector storage
                doc_id = document_service.process_pdf(
                    pdf_path=str(temp_file_path),
                    study_set_id=str(study_set_id),
                    user_id=current_user.user_id
                )

                # Fetch inserted document record from database
                doc_record = study_set_repository.get_document_by_id(doc_id)
                if doc_record:
                    uploaded_docs.append(DocumentResponse(**doc_record))

            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error processing file '{orig_name}': {str(e)}"
                )

    return DocumentListResponse(documents=uploaded_docs)


@router.get(
    "/study-sets/{study_set_id}/documents",
    response_model=DocumentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List documents in a study set",
    description="Retrieves all documents associated with the specified study set UUID."
)
def list_study_set_documents(
    study_set_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> DocumentListResponse:
    study_set = study_set_repository.get_study_set(str(study_set_id), user_id=current_user.user_id)
    if not study_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study set with ID '{study_set_id}' not found"
        )

    try:
        docs = study_set_repository.get_documents_by_study_set(str(study_set_id))
        return DocumentListResponse(
            documents=[DocumentResponse(**d) for d in docs]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve documents: {str(e)}"
        )


@router.get(
    "/documents/{document_id}",
    response_model=DocumentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get document details by ID",
    description="Retrieves information for a specific document by its UUID."
)
def get_document(
    document_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> DocumentResponse:
    try:
        doc = study_set_repository.get_document_by_id(str(document_id))
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{document_id}' not found"
            )

        # Verify ownership through relationship: document -> study_set -> user_id
        study_set = study_set_repository.get_study_set(doc["study_set_id"], user_id=current_user.user_id)
        if not study_set:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{document_id}' not found"
            )

        return DocumentResponse(**doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve document details: {str(e)}"
        )


@router.get(
    "/documents/{document_id}/summary",
    response_model=SummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a quick summary of a document",
    description="Generates a quick, orientation-level summary of a document's study material using Gemini. Generated fresh on each request and not persisted."
)
def get_document_summary(
    document_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> SummaryResponse:
    doc = study_set_repository.get_document_by_id(str(document_id))
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found"
        )

    # Verify ownership through relationship: document -> study_set -> user_id
    study_set = study_set_repository.get_study_set(doc["study_set_id"], user_id=current_user.user_id)
    if not study_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found"
        )

    try:
        summary = generate_summary(document_ids=str(document_id))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}"
        )

    return SummaryResponse(**summary)

