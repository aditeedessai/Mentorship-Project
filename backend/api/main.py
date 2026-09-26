import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from backend.answer_evaluation.sbert_model import preload_models
from backend.database.database import close_pool, init_db, init_pool
from backend.api.routes import (
    account,
    audit,
    activity,
    attempts,
    auth,
    documents,
    exams,
    google_calendar,
    health,
    performance,
    planner,
    progress,
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
    except Exception as e:
        logger.warning("main.py: background model preloading failed (%s).", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Connection pool first
    print("main.py: creating database connection pool...")
    start = time.monotonic()
    init_pool()
    elapsed = time.monotonic() - start
    print(f"main.py: connection pool created in {elapsed:.2f}s.")

    # 2. Database reachability check
    print("main.py: checking database connection...")
    start = time.monotonic()
    init_db()
    elapsed = time.monotonic() - start
    print(f"main.py: database connection established in {elapsed:.2f}s.")

    # 3. Background model loading
    preload_task = asyncio.create_task(_preload_models_in_background())

    yield

    preload_task.cancel()

    print("main.py: closing database connection pool...")
    close_pool()
    print("main.py: connection pool closed.")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security-related HTTP response headers to every response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent MIME-type sniffing.
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent the API from being embedded in frames.
        response.headers["X-Frame-Options"] = "DENY"

        # Restrict framing through CSP as an additional protection.
        response.headers["Content-Security-Policy"] = "frame-ancestors 'none'"

        # Prevent browsers from sending the full URL as the referrer.
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Restrict browser capabilities that are not required by the API.
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )

        # HSTS should only be sent when the API is served over HTTPS.
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )

        return response


app = FastAPI(
    title="STUDY ENGINE API",
    version="1.0.0",
    description="FastAPI API layer for the study engine.",
    lifespan=lifespan,
)

# ── Security Headers ────────────────────────────────────────────────
app.add_middleware(SecurityHeadersMiddleware)

# ── CORS Configuration ───────────────────────────────────────────────
# Allow the React/Vite frontend to communicate with the FastAPI backend.
# Extra origins (e.g. the deployed Vercel frontend) come from CORS_ORIGINS,
# a comma-separated list in backend/.env.
_extra_cors_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *_extra_cors_origins,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Base API Router under /api ───────────────────────────────────────
api_router = APIRouter(prefix="/api")

# Include all module routers under /api
api_router.include_router(auth.router)
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
api_router.include_router(audit.router)
api_router.include_router(google_calendar.router)
api_router.include_router(progress.router)

# Mount API router to app
app.include_router(api_router)