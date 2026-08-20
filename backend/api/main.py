from fastapi import APIRouter, FastAPI

from backend.api.routes import (
    attempts,
    documents,
    health,
    performance,
    questions,
    study_sets,
)

app = FastAPI(
    title="STUDY ENGINE API",
    version="1.0.0",
    description="FastAPI API layer for the study engine.",
)

# Base API Router under /api
api_router = APIRouter(prefix="/api")

# Include all module routers under /api
api_router.include_router(health.router)
api_router.include_router(study_sets.router)
api_router.include_router(documents.router)
api_router.include_router(questions.router)
api_router.include_router(attempts.router)
api_router.include_router(performance.router)

# Mount API router to app
app.include_router(api_router)
