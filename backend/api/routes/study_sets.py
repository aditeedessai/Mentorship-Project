from datetime import datetime, timezone
import uuid
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.study_set import (
    CreateStudySetRequest,
    DeleteStudySetResponse,
    FlashcardsResponse,
    MnemonicRequest,
    MnemonicResponse,
    StudySetListResponse,
    StudySetResponse,
    SummaryResponse,
)
from backend.services import study_service
from backend.quiz_generation.summary_generator import generate_summary
from backend.quiz_generation.flashcard_generator import generate_flashcards
from backend.quiz_generation.mnemonic_generator import generate_mnemonic

router = APIRouter(prefix="/study-sets", tags=["Study Sets"])


@router.post(
    "/{study_set_id}/summary",
    response_model=SummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate summary for a study set",
    description="Generates an AI summary of all uploaded documents attached to the specified study set."
)
def generate_study_set_summary(
    study_set_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> SummaryResponse:
    try:
        # Verify ownership
        study_set = study_service.get_study_set(str(study_set_id), user_id=current_user.user_id)
        if not study_set:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Study set with ID '{study_set_id}' not found"
            )

        summary_data = generate_summary(study_set_id=str(study_set_id))
        return SummaryResponse(**summary_data)
    except HTTPException:
        raise
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


@router.post(
    "/{study_set_id}/flashcards",
    response_model=FlashcardsResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate flashcards for a study set",
    description="Generates AI flashcards from all uploaded documents attached to the specified study set."
)
def generate_study_set_flashcards(
    study_set_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> FlashcardsResponse:
    try:
        # Verify ownership
        study_set = study_service.get_study_set(str(study_set_id), user_id=current_user.user_id)
        if not study_set:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Study set with ID '{study_set_id}' not found"
            )

        flashcard_data = generate_flashcards(study_set_id=str(study_set_id))
        return FlashcardsResponse(**flashcard_data)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate flashcards: {str(e)}"
        )


@router.post(
    "/{study_set_id}/mnemonics",
    response_model=MnemonicResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a contextual mnemonic for a study set",
    description="Generates a customized memory trick for a topic grounded in uploaded study material."
)
def generate_study_set_mnemonic(
    study_set_id: UUID,
    payload: MnemonicRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> MnemonicResponse:
    try:
        # Verify ownership
        study_set = study_service.get_study_set(str(study_set_id), user_id=current_user.user_id)
        if not study_set:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Study set with ID '{study_set_id}' not found"
            )

        mnemonic_data = generate_mnemonic(
            study_set_id=str(study_set_id),
            topic=payload.topic,
            style=payload.style
        )
        return MnemonicResponse(**mnemonic_data)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate mnemonic: {str(e)}"
        )


@router.post(
    "",
    response_model=StudySetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new study set",
    description="Creates a new study set for the authenticated user and returns study set details."
)
def create_study_set(
    payload: CreateStudySetRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> StudySetResponse:
    try:
        data = study_service.create_study_set(payload.name, user_id=current_user.user_id)
        return StudySetResponse(**data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create study set: {str(e)}"
        )


@router.get(
    "",
    response_model=StudySetListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all study sets",
    description="Retrieves a list of study sets owned by the authenticated user."
)
def list_study_sets(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> StudySetListResponse:
    try:
        sets_data = study_service.list_study_sets(user_id=current_user.user_id)
        return StudySetListResponse(
            study_sets=[StudySetResponse(**s) for s in sets_data]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list study sets: {str(e)}"
        )


@router.get(
    "/{study_set_id}",
    response_model=StudySetResponse,
    status_code=status.HTTP_200_OK,
    summary="Get study set details by ID",
    description="Retrieves details for a specific study set by its UUID if owned by the authenticated user."
)
def get_study_set(
    study_set_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> StudySetResponse:
    try:
        data = study_service.get_study_set(str(study_set_id), user_id=current_user.user_id)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Study set with ID '{study_set_id}' not found"
            )
        return StudySetResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get study set details: {str(e)}"
        )


@router.delete(
    "/{study_set_id}",
    response_model=DeleteStudySetResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a study set by ID",
    description="Deletes a specific study set by its UUID if owned by the authenticated user."
)
def delete_study_set(
    study_set_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> DeleteStudySetResponse:
    try:
        deleted = study_service.delete_study_set(str(study_set_id), user_id=current_user.user_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Study set with ID '{study_set_id}' not found"
            )
        return DeleteStudySetResponse(
            message="Study set deleted successfully",
            study_set_id=study_set_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete study set: {str(e)}"
        )
