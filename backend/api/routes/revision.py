import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.revision import RevisionStatusItem, RevisionStatusListResponse
from backend.database import study_set_repository
from backend.services import revision_service

router = APIRouter(tags=["Revision"])

QUESTION_TYPES = ["mcq", "application", "long", "short"]


@router.get(
    "/study-sets/{study_set_id}/revision-status",
    response_model=RevisionStatusListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get revision status for a study set",
    description="Retrieves due/needs_attention/attempts_taken status for all 4 question types under a study set's revision schedule."
)
def get_revision_status(
    study_set_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> RevisionStatusListResponse:
    study_set_id_str = str(study_set_id)

    # Same ownership pattern as every other study-set-scoped route.
    study_set = study_set_repository.get_study_set(study_set_id_str, user_id=current_user.user_id)
    if not study_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study set with ID '{study_set_id}' not found"
        )

    statuses = [
        RevisionStatusItem(
            question_type=question_type,
            **revision_service.compute_next_due(study_set_id_str, question_type, current_user.user_id)
        )
        for question_type in QUESTION_TYPES
    ]

    return RevisionStatusListResponse(study_set_id=study_set_id_str, statuses=statuses)
