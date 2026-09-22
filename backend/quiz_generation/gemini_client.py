import json
import logging
import os
import random
import re
import time
from email.utils import parsedate_to_datetime
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
import httpx

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError(
        "GEMINI_API_KEY not found. Create backend/.env from backend/.env.example."
    )

logger = logging.getLogger(__name__)

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
GEMINI_TIMEOUT_MS = int(os.getenv("GEMINI_TIMEOUT_MS", "120000"))
GEMINI_MAX_ATTEMPTS = max(1, int(os.getenv("GEMINI_MAX_ATTEMPTS", "3")))
GEMINI_MAX_BACKOFF_SECONDS = max(
    1.0, float(os.getenv("GEMINI_MAX_BACKOFF_SECONDS", "8"))
)
TRANSIENT_STATUS_CODES = {429, 500, 502, 503}
SUPPORTED_QUESTION_TYPES = {"mcq", "short", "long", "application"}

client = genai.Client(
    api_key=api_key,
    http_options=types.HttpOptions(
        timeout=GEMINI_TIMEOUT_MS,
        retry_options=types.HttpRetryOptions(attempts=1),
    ),
)


class GeminiGenerationError(Exception):
    """A safe, status-aware error raised by the shared Gemini boundary."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 502,
        retry_after: str | None = None,
        feature: str | None = None,
        category: str = "generation",
        attempt: int | None = None,
        attempts: int | None = None,
        transient: bool | None = None,
        provider_status: int | None = None,
        exception_type: str | None = None,
        provider_message: str | None = None,
    ) -> None:
        super().__init__(message)
        self.public_message = message
        self.status_code = status_code
        self.retry_after = retry_after
        self.feature = feature
        self.category = category
        self.attempt = attempt
        self.attempts = attempts
        self.transient = transient
        self.provider_status = provider_status
        self.exception_type = exception_type
        self.provider_message = provider_message


def _response_schema(feature: str, question_type: str | None = None) -> dict:
    if feature == "summary":
        return {
            "type": "OBJECT",
            "properties": {
                "title": {"type": "STRING"},
                "overview_paragraphs": {"type": "ARRAY", "items": {"type": "STRING"}},
                "key_topics": {"type": "ARRAY", "items": {"type": "STRING"}},
            },
            "required": ["title", "overview_paragraphs", "key_topics"],
        }
    if feature == "flashcards":
        return {
            "type": "OBJECT",
            "properties": {
                "flashcards": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "term": {"type": "STRING"},
                            "definition": {"type": "STRING"},
                        },
                        "required": ["term", "definition"],
                    },
                }
            },
            "required": ["flashcards"],
        }
    if question_type not in SUPPORTED_QUESTION_TYPES:
        raise ValueError(f"Unsupported quiz question type: {question_type}")

    return {
        "type": "OBJECT",
        "properties": {
            "questions": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "question_id": {"type": "STRING"},
                        "question_type": {"type": "STRING", "enum": sorted(SUPPORTED_QUESTION_TYPES)},
                        "topic": {"type": "STRING"},
                        "question": {"type": "STRING"},
                        "options": {
                            "type": "OBJECT",
                            "properties": {
                                "A": {"type": "STRING"},
                                "B": {"type": "STRING"},
                                "C": {"type": "STRING"},
                                "D": {"type": "STRING"},
                            },
                        },
                        "correct_option": {"type": "STRING", "enum": ["A", "B", "C", "D"]},
                        "reference_answer": {"type": "STRING"},
                    },
                    "required": ["question_type", "topic", "question", "reference_answer"],
                },
            }
        },
        "required": ["questions"],
    }


def _retry_after(exc: Exception) -> str | None:
    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None)
    if headers:
        value = headers.get("Retry-After") or headers.get("retry-after")
        if value:
            return str(value)
    return None


def _status_code(exc: Exception) -> int | None:
    code = getattr(exc, "code", None)
    return code if isinstance(code, int) else None


def _safe_provider_message(exc: Exception) -> str:
    message = getattr(exc, "message", None) or str(exc)
    message = re.sub(r"(?:AIza|AQ\.)[A-Za-z0-9_-]+", "[REDACTED]", str(message))
    message = re.sub(r"Bearer\s+\S+", "Bearer [REDACTED]", message, flags=re.IGNORECASE)
    return message[:500]


def _log_final_failure(
    *,
    feature: str,
    attempt: int,
    transient: bool,
    status_code: int | None,
    exception_type: str,
    provider_message: str,
) -> None:
    logger.error(
        "Gemini %s generation exhausted after attempt %d/%d "
        "(status=%s, exception=%s, transient=%s): %s",
        feature,
        attempt,
        GEMINI_MAX_ATTEMPTS,
        status_code,
        exception_type,
        transient,
        provider_message,
    )


def _is_transient(exc: Exception) -> bool:
    code = _status_code(exc)
    if code is not None:
        return code in TRANSIENT_STATUS_CODES
    return isinstance(exc, (TimeoutError, ConnectionError, OSError, httpx.TimeoutException, httpx.NetworkError))


def _json_text(response: object, feature: str) -> object:
    response_text = getattr(response, "text", None)
    if not isinstance(response_text, str) or not response_text.strip():
        raise GeminiGenerationError(
            f"Gemini returned an empty {feature} response.",
            status_code=502,
            feature=feature,
            category="empty_response",
        )

    cleaned = response_text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)\s*```", cleaned, re.IGNORECASE | re.DOTALL)
    if fenced:
        cleaned = fenced.group(1).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()
        for start, character in enumerate(cleaned):
            if character not in "[{":
                continue
            try:
                value, _ = decoder.raw_decode(cleaned[start:])
                return value
            except json.JSONDecodeError:
                continue
        raise GeminiGenerationError(
            f"Gemini returned malformed {feature} JSON.",
            status_code=502,
            feature=feature,
            category="malformed_json",
        )


def _validate_payload(payload: object, feature: str, question_type: str | None) -> dict:
    if feature == "flashcards" and isinstance(payload, list):
        payload = {"flashcards": payload}

    if not isinstance(payload, dict):
        raise GeminiGenerationError(
            f"Gemini returned an unexpected {feature} response structure.",
            status_code=502,
            feature=feature,
            category="invalid_structure",
        )

    if feature == "summary":
        if (
            not isinstance(payload.get("title"), str)
            or not isinstance(payload.get("overview_paragraphs"), list)
            or not isinstance(payload.get("key_topics"), list)
            or not all(isinstance(item, str) for item in payload["overview_paragraphs"] + payload["key_topics"])
        ):
            raise GeminiGenerationError(
                "Gemini returned an invalid summary structure.",
                status_code=502,
                feature=feature,
                category="validation_failure",
            )
        return payload

    if feature == "flashcards":
        cards = payload.get("flashcards")
        if not isinstance(cards, list) or not cards or not all(
            isinstance(card, dict)
            and isinstance(card.get("term"), str)
            and isinstance(card.get("definition"), str)
            for card in cards
        ):
            raise GeminiGenerationError(
                "Gemini returned an invalid flashcard structure.",
                status_code=502,
                feature=feature,
                category="validation_failure",
            )
        return payload

    questions = payload.get("questions")
    if question_type not in SUPPORTED_QUESTION_TYPES:
        raise GeminiGenerationError(
            "Gemini returned an unsupported quiz question type.",
            status_code=502,
            feature=feature,
            category="validation_failure",
        )
    if not isinstance(questions, list) or len(questions) != 5:
        raise GeminiGenerationError(
            "Gemini returned an invalid quiz structure: exactly 5 questions are required.",
            status_code=502,
            feature=feature,
            category="validation_failure",
        )
    for question in questions:
        if not isinstance(question, dict) or any(
            not isinstance(question.get(field), str)
            for field in ("question_type", "topic", "question", "reference_answer")
        ) or question["question_type"] != question_type:
            raise GeminiGenerationError(
                "Gemini returned an invalid quiz question structure.",
                status_code=502,
                feature=feature,
                category="validation_failure",
            )
        if question_type == "mcq":
            options = question.get("options")
            if (
                not isinstance(options, dict)
                or set(options) != {"A", "B", "C", "D"}
                or not all(isinstance(value, str) for value in options.values())
                or question.get("correct_option") not in options
            ):
                raise GeminiGenerationError(
                    "Gemini returned an invalid multiple-choice question structure.",
                    status_code=502,
                    feature=feature,
                    category="validation_failure",
                )
    return payload


def generate_json(
    request_client: object,
    *,
    feature: str,
    prompt: str,
    question_type: str | None = None,
) -> dict:
    """Generate and validate one structured Gemini response for any feature."""
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=_response_schema(feature, question_type),
    )

    for attempt in range(1, GEMINI_MAX_ATTEMPTS + 1):
        started = time.monotonic()
        try:
            response = request_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=config,
            )
            payload = _json_text(response, feature)
            validated = _validate_payload(payload, feature, question_type)
            logger.info(
                "Gemini %s generation succeeded on attempt %d in %.2fs (model=%s, prompt_chars=%d)",
                feature,
                attempt,
                time.monotonic() - started,
                GEMINI_MODEL,
                len(prompt),
            )
            return validated
        except GeminiGenerationError as exc:
            logger.warning(
                "Gemini %s response rejected (attempt=%d, category=%s, status=%s): %s",
                feature,
                attempt,
                exc.category,
                exc.status_code,
                exc.public_message,
            )
            raise
        except Exception as exc:
            code = _status_code(exc)
            transient = _is_transient(exc)
            provider_message = _safe_provider_message(exc)
            exception_type = type(exc).__name__
            logger.warning(
                "Gemini %s generation failed on attempt %d/%d (status=%s, transient=%s, elapsed=%.2fs): %s",
                feature,
                attempt,
                GEMINI_MAX_ATTEMPTS,
                code,
                transient,
                time.monotonic() - started,
                type(exc).__name__,
            )
            if not transient or attempt >= GEMINI_MAX_ATTEMPTS:
                _log_final_failure(
                    feature=feature,
                    attempt=attempt,
                    transient=transient,
                    status_code=code,
                    exception_type=exception_type,
                    provider_message=provider_message,
                )
                if code == 429:
                    raise GeminiGenerationError(
                        "Gemini rate limit exceeded. Please try again later.",
                        status_code=429,
                        retry_after=_retry_after(exc),
                        feature=feature,
                        category="provider_rate_limit",
                        attempt=attempt,
                        attempts=attempt,
                        transient=transient,
                        provider_status=code,
                        exception_type=exception_type,
                        provider_message=provider_message,
                    ) from exc
                if code in {500, 502, 503}:
                    raise GeminiGenerationError(
                        "Gemini is temporarily unavailable. Please try again later.",
                        status_code=503,
                        feature=feature,
                        category="provider_unavailable",
                        attempt=attempt,
                        attempts=attempt,
                        transient=transient,
                        provider_status=code,
                        exception_type=exception_type,
                        provider_message=provider_message,
                    ) from exc
                if isinstance(exc, (TimeoutError, httpx.TimeoutException)):
                    raise GeminiGenerationError(
                        "Gemini generation timed out. Please try again later.",
                        status_code=504,
                        feature=feature,
                        category="timeout",
                        attempt=attempt,
                        attempts=attempt,
                        transient=transient,
                        provider_status=code,
                        exception_type=exception_type,
                        provider_message=provider_message,
                    ) from exc
                raise GeminiGenerationError(
                    "Gemini generation failed due to a provider or configuration error.",
                    status_code=502,
                    feature=feature,
                    category="provider_or_configuration",
                    attempt=attempt,
                    attempts=attempt,
                    transient=transient,
                    provider_status=code,
                    exception_type=exception_type,
                    provider_message=provider_message,
                ) from exc

            retry_after = _retry_after(exc)
            requested_delay = 0.0
            if retry_after:
                try:
                    requested_delay = max(0.0, float(retry_after))
                except ValueError:
                    try:
                        requested_delay = max(
                            0.0,
                            parsedate_to_datetime(retry_after).timestamp() - time.time(),
                        )
                    except (TypeError, ValueError, OverflowError):
                        requested_delay = 0.0
            exponential_delay = min(
                GEMINI_MAX_BACKOFF_SECONDS,
                2 ** (attempt - 1),
            )
            # Retry-After is honored, but never beyond the configured cap.
            delay = min(
                GEMINI_MAX_BACKOFF_SECONDS,
                max(exponential_delay, requested_delay),
            )
            time.sleep(delay + random.uniform(0, min(0.5, delay / 4)))

    raise AssertionError("unreachable")
