from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.schemas.account import DeleteAccountResponse
from backend.services.account_service import delete_own_account

router = APIRouter(prefix="/account", tags=["Account"])


@router.delete(
    "",
    response_model=DeleteAccountResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete the current user's account",
    description="Permanently deletes the authenticated user's Supabase Auth account and all associated app data. Always operates on the caller's own id from their verified token - never accepts a user id from the request body."
)
def delete_account(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> DeleteAccountResponse:
    try:
        delete_own_account(current_user.user_id)
        return DeleteAccountResponse(message="Account deleted successfully")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account: {str(e)}"
        )
