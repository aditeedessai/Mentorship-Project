import time
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.answer_evaluation.sbert_model import preload_models
from backend.api.routes import (
    account,
    activity,
    attempts,
    documents,
    exams,
    health,
    performance,
    planner,
    questions,
    revision,
    study_sets,
    tasks,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preloads all 4 answer-evaluation models up front so the cost is
    # paid once here, at startup, instead of unexpectedly on whichever
    # request happens to be first to trigger lazy loading.
    print("main.py: preloading answer-evaluation models...")
    start = time.monotonic()
    preload_models()
    elapsed = time.monotonic() - start
    print(f"main.py: model preloading complete in {elapsed:.1f}s.")
    yield


app = FastAPI(
    title="STUDY ENGINE API",
    version="1.0.0",
    description="FastAPI API layer for the study engine.",
    lifespan=lifespan,
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
api_router.include_router(revision.router)
api_router.include_router(planner.router)
api_router.include_router(tasks.router)
api_router.include_router(exams.router)
api_router.include_router(activity.router)
api_router.include_router(account.router)

# Mount API router to app
app.include_router(api_router)