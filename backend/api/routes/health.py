from fastapi import APIRouter
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"


router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def check_health() -> HealthResponse:
    return HealthResponse(status="ok")

