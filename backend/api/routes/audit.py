from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.rate_limiter import rate_limit_by_user
from backend.database.audit_log_repository import create_audit_log

router = APIRouter(prefix="/audit", tags=["Audit"])


class AuditLogRequest(BaseModel):
    action: str


@router.post(
    "/log",
    status_code=status.HTTP_201_CREATED,
    summary="Create an audit log",
)
def create_audit_log_entry(
    payload: AuditLogRequest,
    current_user: AuthenticatedUser = Depends(
        rate_limit_by_user(120, 60, scope="general_authenticated")
    ),
):
    create_audit_log(
        user_id=current_user.user_id,
        action=payload.action,
    )

    return {
        "message": "Audit log created successfully"
    }