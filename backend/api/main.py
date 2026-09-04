import asyncio
import logging
import time
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.answer_evaluation.sbert_model import preload_models
from backend.database.database import init_db
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

logger = logging.getLogger(__name__)


async def _preload_models_in_background() -> None:
    """
    Runs preload_models() (the 4 answer-evaluation models) in a worker
    thread via asyncio.to_thread instead of on the event loop, so it
    never blocks request handling - including DB-only endpoints, which
    have nothing to do with these models at all. Endpoints that need a
    specific model before this finishes still work correctly: every
    _get_*() function in sbert_model.py lazy-loads (and caches) its own
    model on first use regardless of whether preloading has completed.
    """
    print("main.py: preloading answer-evaluation models in the background...")
    start = time.monotonic()
    try:
        await asyncio.to_thread(preload_models)
        elapsed = time.monotonic() - start
        print(f"main.py: background model preloading complete in {elapsed:.1f}s.")
    except Exception as e:  # pragma: no cover - preload_models() already
        # isolates and logs each model's own load failure individually;
        # this is just a last-resort guard so a background task
        # exception never surfaces as an unhandled asyncio error with no
        # context instead.
        logger.warning("main.py: background model preloading failed (%s).", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Database first: a fast reachability check (SELECT 1 - see
    # init_db()) so the app fails fast on DB misconfiguration and every
    # DB-backed endpoint is usable the instant the server starts
    # accepting requests, instead of waiting behind model loading below.
    print("main.py: checking database connection...")
    start = time.monotonic()
    init_db()
    elapsed = time.monotonic() - start
    print(f"main.py: database connection established in {elapsed:.2f}s.")

    # 2. Model loading happens afterward, in the background - kicked off
    # here but not awaited, so `yield` (and uvicorn accepting requests)
    # isn't delayed by it. See _preload_models_in_background().
    preload_task = asyncio.create_task(_preload_models_in_background())

    yield

    preload_task.cancel()


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