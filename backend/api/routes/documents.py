from pathlib import Path
import tempfile
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
)
from backend.database import study_set_repository
from backend.document_processing.extractor import SUPPORTED_EXTENSIONS
from backend.services import document_service

router = APIRouter(tags=["Documents"])


@router.post(
    "/study-sets/{study_set_id}/documents",
    response_model=DocumentListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload document(s) or image(s) to a study set",
    description="Uploads files (PDF, DOCX, PPTX, PNG, JPG, JPEG, WEBP) to an existing study set.",
)
def upload_documents(
    study_set_id: UUID,
    files: list[UploadFile] = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DocumentListResponse:
  if not files:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="At least one file must be provided for upload.",
    )

  # 1. Verify study set exists and belongs to current_user
  study_set = study_set_repository.get_study_set(
      str(study_set_id), user_id=current_user.user_id
  )
  if not study_set:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Study set with ID '{study_set_id}' not found",
    )

  # 2. Validate file extensions against supported set
  for file in files:
    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in SUPPORTED_EXTENSIONS:
      allowed_formats = ", ".join(sorted(SUPPORTED_EXTENSIONS))
      raise HTTPException(
          status_code=status.HTTP_400_BAD_REQUEST,
          detail=(
              f"Unsupported file format '{file_ext}'. Allowed formats:"
              f" {allowed_formats}"
          ),
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

        # Process file: OCR/text extraction -> cleaning -> chunking -> embeddings -> DB
        doc_id = document_service.process_pdf(
            pdf_path=str(temp_file_path),
            study_set_id=str(study_set_id),
            user_id=current_user.user_id,
        )

        doc_record = study_set_repository.get_document_by_id(doc_id)
        if doc_record:
          uploaded_docs.append(DocumentResponse(**doc_record))

      except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file '{orig_name}': {str(e)}",
        )

  return DocumentListResponse(documents=uploaded_docs)


@router.get(
    "/study-sets/{study_set_id}/documents",
    response_model=DocumentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List documents in a study set",
)
def list_study_set_documents(
    study_set_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DocumentListResponse:
  study_set = study_set_repository.get_study_set(
      str(study_set_id), user_id=current_user.user_id
  )
  if not study_set:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Study set with ID '{study_set_id}' not found",
    )

  try:
    docs = study_set_repository.get_documents_by_study_set(str(study_set_id))
    return DocumentListResponse(
        documents=[DocumentResponse(**d) for d in docs]
    )
  except Exception as e:
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Failed to retrieve documents: {str(e)}",
    )


@router.get(
    "/documents/{document_id}",
    response_model=DocumentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get document details by ID",
)
def get_document(
    document_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DocumentResponse:
  try:
    doc = study_set_repository.get_document_by_id(str(document_id))
    if not doc:
      raise HTTPException(
          status_code=status.HTTP_404_NOT_FOUND,
          detail=f"Document with ID '{document_id}' not found",
      )

    study_set = study_set_repository.get_study_set(
        doc["study_set_id"], user_id=current_user.user_id
    )
    if not study_set:
      raise HTTPException(
          status_code=status.HTTP_404_NOT_FOUND,
          detail=f"Document with ID '{document_id}' not found",
      )

    return DocumentResponse(**doc)
  except HTTPException:
    raise
  except Exception as e:
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Failed to retrieve document details: {str(e)}",
    )