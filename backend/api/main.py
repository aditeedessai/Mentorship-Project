from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import (
    activity,
    attempts,
    documents,
    exams,
    health,
    performance,
    questions,
    study_sets,
    tasks,
)

app = FastAPI(
    title="STUDY ENGINE API",
    version="1.0.0",
    description="FastAPI API layer for the study engine.",
)

# ── CORS Configuration ───────────────────────────────────────────────
# Allow the React/Vite frontend to communicate with the FastAPI backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Base API Router under /api ───────────────────────────────────────
api_router = APIRouter(prefix="/api")

# Include all module routers under /api
api_router.include_router(health.router)
api_router.include_router(study_sets.router)
api_router.include_router(documents.router)
api_router.include_router(questions.router)
api_router.include_router(attempts.router)
api_router.include_router(performance.router)
api_router.include_router(tasks.router)
api_router.include_router(exams.router)
api_router.include_router(activity.router)

# Mount API router to app
app.include_router(api_router)