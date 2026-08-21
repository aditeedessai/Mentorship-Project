from datetime import datetime, timezone
import uuid
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.study_set import (
    CreateStudySetRequest,
    DeleteStudySetResponse,
    StudySetListResponse,
    StudySetResponse,
)
from backend.services import study_service

router = APIRouter(prefix="/study-sets", tags=["Study Sets"])


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

