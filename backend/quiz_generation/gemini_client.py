import os
import re
import time
import random
import logging
import threading
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
from dotenv import load_dotenv
from google import genai
from google.genai import errors as genai_errors

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

logger = logging.getLogger("gemini_reliability")
logger.setLevel(logging.INFO)

# Configuration from Environment Variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not found in environment variables.")

GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-3.6-flash")
GEMINI_FALLBACK_MODEL_NAME = os.getenv("GEMINI_FALLBACK_MODEL_NAME", "gemini-2.5-flash")
GEMINI_MAX_RETRIES = int(os.getenv("GEMINI_MAX_RETRIES", "3"))
GEMINI_MAX_CONCURRENT_REQUESTS = int(os.getenv("GEMINI_MAX_CONCURRENT_REQUESTS", "5"))
GEMINI_MAX_CONTEXT_CHARS = int(os.getenv("GEMINI_MAX_CONTEXT_CHARS", "100000"))

# Global Thread-Safe Concurrency Control
_CONCURRENCY_SEMAPHORE = threading.Semaphore(GEMINI_MAX_CONCURRENT_REQUESTS)

# Global Client Instance
_client_instance = None
_client_lock = threading.Lock()


def get_genai_client() -> genai.Client:
    global _client_instance
    if _client_instance is None:
        with _client_lock:
            if _client_instance is None:
                key = os.getenv("GEMINI_API_KEY")
                if not key:
                    raise GeminiConfigurationError("GEMINI_API_KEY environment variable is not configured.")
                _client_instance = genai.Client(api_key=key)
    return _client_instance


# ── Custom Exception Hierarchy ──────────────────────────────────────────────────

class GeminiError(Exception):
    """Base exception for Gemini API operations."""
    def __init__(self, message: str, status_code: int = 500, raw_error: Exception = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.raw_error = raw_error


class GeminiRateLimitError(GeminiError):
    """429 / RESOURCE_EXHAUSTED / Quota limit reached."""
    def __init__(self, message: str = "AI generation is temporarily busy due to rate limits. Please try again in a moment.", raw_error: Exception = None):
        super().__init__(message, status_code=429, raw_error=raw_error)


class GeminiServiceUnavailableError(GeminiError):
    """503 / Model Overloaded / Connection Failure."""
    def __init__(self, message: str = "The AI service is temporarily busy. Please try again shortly.", raw_error: Exception = None):
        super().__init__(message, status_code=503, raw_error=raw_error)


class GeminiConfigurationError(GeminiError):
    """Permanent client error (400, 401, 403, missing key, etc.)."""
    def __init__(self, message: str = "AI service configuration error.", raw_error: Exception = None):
        super().__init__(message, status_code=500, raw_error=raw_error)


# ── In-Flight Deduplication (Single-Flight Lock) ────────────────────────────────

class InFlightDeduplicator:
    """
    Prevents duplicate simultaneous Gemini calls for identical requests.
    If request A is in progress for key K, request B for key K will wait
    for request A to finish and return the exact same result/error.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._in_flight: Dict[str, Tuple[threading.Event, Dict[str, Any]]] = {}

    def execute(self, key: str, func: Callable, *args, **kwargs) -> Any:
        if not key:
            return func(*args, **kwargs)

        event = None
        is_leader = False

        with self._lock:
            if key in self._in_flight:
                event, result_box = self._in_flight[key]
            else:
                event = threading.Event()
                result_box = {}
                self._in_flight[key] = (event, result_box)
                is_leader = True

        if is_leader:
            try:
                result = func(*args, **kwargs)
                result_box["value"] = result
                result_box["success"] = True
                return result
            except Exception as err:
                result_box["error"] = err
                result_box["success"] = False
                raise
            finally:
                with self._lock:
                    event.set()
                    self._in_flight.pop(key, None)
        else:
            logger.info("Deduplicating in-flight Gemini request for key: %s", key)
            event.wait(timeout=120)
            if result_box.get("success"):
                return result_box.get("value")
            elif "error" in result_box:
                raise result_box["error"]
            else:
                raise GeminiServiceUnavailableError("In-flight request timed out waiting for duplicate completion.")


_DEDUPLICATOR = InFlightDeduplicator()


# ── Transient Error Detection & Delay Helpers ────────────────────────────────────

def is_transient_error(exc: Exception) -> Tuple[bool, str, int]:
    """
    Analyzes an exception and returns (is_transient, category, status_code).
    Categories: 'rate_limit' (429), 'service_unavailable' (503), or 'permanent'.
    """
    exc_str = str(exc).lower()
    code = getattr(exc, "code", getattr(exc, "status_code", None))

    if isinstance(exc, genai_errors.APIError):
        code = getattr(exc, "code", getattr(exc, "status_code", code))

    # Check Rate Limit / Quota / 429 / Higher Model Usage
    if (
        code == 429
        or "resource_exhausted" in exc_str
        or "429" in exc_str
        or "quota" in exc_str
        or "rate limit" in exc_str
        or "ratelimit" in exc_str
        or "too many requests" in exc_str
        or "higher model usage" in exc_str
    ):
        return True, "rate_limit", 429

    # Check 503 / Service Unavailable / Model Overloaded / Connection Errors
    if (
        code in (502, 503, 504)
        or "503" in exc_str
        or "502" in exc_str
        or "504" in exc_str
        or "overloaded" in exc_str
        or "model overloaded" in exc_str
        or "temporarily unavailable" in exc_str
        or "service unavailable" in exc_str
        or "connection reset" in exc_str
        or "connection error" in exc_str
        or "connection refused" in exc_str
        or "timeout" in exc_str
        or "timed out" in exc_str
        or "wsarecv" in exc_str
        or "wsasend" in exc_str
        or isinstance(exc, (TimeoutError, ConnectionError, OSError))
    ):
        return True, "service_unavailable", 503

    # Permanent client errors (400, 401, 403, 404, invalid auth, bad request)
    return False, "permanent", code or 400


def parse_retry_after(exc: Exception) -> Optional[float]:
    """Extracts suggested retry delay in seconds if provided by Gemini error message or headers."""
    exc_str = str(exc)
    match = re.search(r"retry in (\d+(?:\.\d+)?)s", exc_str, re.IGNORECASE) or re.search(r"retry after (\d+(?:\.\d+)?)s", exc_str, re.IGNORECASE)
    if match:
        try:
            val = float(match.group(1))
            if 0.1 <= val <= 30.0:
                return val
        except ValueError:
            pass
    return None


# ── Context Length Truncation ────────────────────────────────────────────────---

def truncate_text_chunks(chunks_or_text: Union[List[Any], str], max_chars: int = GEMINI_MAX_CONTEXT_CHARS) -> str:
    """
    Safely limits context length to max_chars by selecting complete chunks
    without breaking prompt structure.
    """
    if isinstance(chunks_or_text, str):
        if len(chunks_or_text) <= max_chars:
            return chunks_or_text
        # Truncate at paragraph/sentence boundary
        truncated = chunks_or_text[:max_chars]
        last_break = max(truncated.rfind("\n\n"), truncated.rfind(". "))
        if last_break > max_chars * 0.5:
            return truncated[:last_break] + "\n\n[Content truncated to fit context limits]"
        return truncated + "\n\n[Content truncated to fit context limits]"

    # If chunks list is passed
    text_pieces = []
    current_length = 0

    for chunk in chunks_or_text:
        chunk_text = chunk.get("text", "") if isinstance(chunk, dict) else str(chunk)
        chunk_len = len(chunk_text)
        if current_length + chunk_len + 2 > max_chars:
            if not text_pieces:
                # First chunk itself exceeds max_chars
                text_pieces.append(chunk_text[:max_chars])
            break
        text_pieces.append(chunk_text)
        current_length += chunk_len + 2

    return "\n\n".join(text_pieces)


# ── Shared Gemini Generation Wrapper ───────────────────────────────────────────

class GeminiResponseWrapper:
    """Wrapper around Gemini SDK response to maintain backward compatibility (.text attribute)."""
    def __init__(self, text: str):
        self.text = text


def _single_gemini_call(
    prompt: str,
    model_name: Optional[str] = None,
    system_instruction: Optional[str] = None,
    max_output_tokens: Optional[int] = None
) -> str:
    """Performs a single execution against the Gemini API."""
    c = get_genai_client()
    target_model = model_name or os.getenv("GEMINI_MODEL_NAME", GEMINI_MODEL_NAME)

    config_kwargs = {}
    if system_instruction:
        config_kwargs["system_instruction"] = system_instruction
    if max_output_tokens:
        config_kwargs["max_output_tokens"] = max_output_tokens

    config = genai.types.GenerateContentConfig(**config_kwargs) if config_kwargs else None

    if config:
        response = c.models.generate_content(model=target_model, contents=prompt, config=config)
    else:
        response = c.models.generate_content(model=target_model, contents=prompt)

    if not response or not hasattr(response, "text") or not response.text:
        raise GeminiServiceUnavailableError("Gemini API returned an empty or invalid response.")

    return response.text


def generate_content_with_retry(
    prompt: str,
    model_name: Optional[str] = None,
    system_instruction: Optional[str] = None,
    task_name: str = "gemini_generation",
    dedup_key: Optional[str] = None,
    max_output_tokens: Optional[int] = None,
    max_retries: Optional[int] = None
) -> GeminiResponseWrapper:
    """
    Main shared entry point for all Gemini generation tasks.
    Enforces:
    - Global concurrency limit (_CONCURRENCY_SEMAPHORE)
    - In-flight duplicate request deduplication (_DEDUPLICATOR)
    - Context size protection (truncate_text_chunks)
    - Exponential backoff retry with jitter on transient failures (429/503)
    - Automatic transition to configured fallback model on quota exhaustion / model overload
    - Clean exception mapping (GeminiRateLimitError, GeminiServiceUnavailableError)
    - Backward compatible response object (.text)
    """
    def _execute():
        # Enforce context length protection
        safe_prompt = truncate_text_chunks(prompt, max_chars=GEMINI_MAX_CONTEXT_CHARS)
        retries_limit = max_retries if max_retries is not None else GEMINI_MAX_RETRIES
        primary_model = model_name or os.getenv("GEMINI_MODEL_NAME", GEMINI_MODEL_NAME)
        fallback_model = os.getenv("GEMINI_FALLBACK_MODEL_NAME", GEMINI_FALLBACK_MODEL_NAME)

        logger.info(
            "Starting Gemini request [task=%s, model=%s, prompt_chars=%d]",
            task_name, primary_model, len(safe_prompt)
        )

        acq_start = time.perf_counter()
        acquired = _CONCURRENCY_SEMAPHORE.acquire(timeout=60.0)
        if not acquired:
            logger.error("Concurrency limit reached waiting for Gemini slot [task=%s]", task_name)
            raise GeminiServiceUnavailableError("AI service concurrency limit reached. Please try again shortly.")

        acq_duration = time.perf_counter() - acq_start
        if acq_duration > 0.1:
            logger.info("Throttled by concurrency limit for %.2fs [task=%s]", acq_duration, task_name)

        try:
            def _run_model_attempts(target_model: str, is_fallback: bool = False):
                attempt = 0
                while attempt <= retries_limit:
                    attempt += 1
                    try:
                        start_time = time.perf_counter()
                        raw_text = _single_gemini_call(
                            prompt=safe_prompt,
                            model_name=target_model,
                            system_instruction=system_instruction,
                            max_output_tokens=max_output_tokens
                        )
                        elapsed = time.perf_counter() - start_time
                        logger.info(
                            "Gemini request succeeded [task=%s, model=%s, duration=%.2fs, attempt=%d/%d, is_fallback=%s]",
                            task_name, target_model, elapsed, attempt, retries_limit + 1, is_fallback
                        )
                        return GeminiResponseWrapper(text=raw_text), None, None
                    except Exception as exc:
                        is_transient, category, status_code = is_transient_error(exc)
                        if not is_transient or attempt > retries_limit:
                            return None, exc, category

                        # Calculate retry backoff delay
                        suggested_delay = parse_retry_after(exc)
                        if suggested_delay:
                            delay = suggested_delay
                        else:
                            base_delay = 1.0 * (2 ** (attempt - 1))
                            jitter = random.uniform(0.1, 0.5)
                            delay = min(15.0, base_delay + jitter)

                        logger.warning(
                            "Gemini transient failure, retrying in %.2fs [task=%s, model=%s, category=%s, attempt=%d/%d, is_fallback=%s]: %s",
                            delay, task_name, target_model, category, attempt, retries_limit + 1, is_fallback, str(exc)
                        )
                        time.sleep(delay)

            # 1. Attempt Primary Model
            res, last_exc, category = _run_model_attempts(primary_model, is_fallback=False)
            if res is not None:
                return res

            # Determine if fallback is eligible
            can_fallback = (
                category in ("rate_limit", "service_unavailable")
                and bool(fallback_model)
                and (fallback_model != primary_model)
            )

            if can_fallback:
                logger.warning(
                    "Primary Gemini model '%s' failed due to %s [task=%s]. Switching to configured fallback model '%s'.",
                    primary_model, category, task_name, fallback_model
                )
                res_fb, last_exc_fb, category_fb = _run_model_attempts(fallback_model, is_fallback=True)
                if res_fb is not None:
                    logger.info(
                        "Fallback Gemini model '%s' succeeded for task '%s' after primary model '%s' failed.",
                        fallback_model, task_name, primary_model
                    )
                    return res_fb
                last_exc = last_exc_fb
                category = category_fb

            # Final failure handling after primary and fallback attempts
            logger.error(
                "Gemini call failed (all attempts & fallbacks exhausted) [task=%s, category=%s, status=%s]: %s",
                task_name, category, getattr(last_exc, "code", getattr(last_exc, "status_code", "N/A")), str(last_exc)
            )
            if category == "rate_limit":
                raise GeminiRateLimitError(raw_error=last_exc) from last_exc
            elif category == "service_unavailable":
                raise GeminiServiceUnavailableError(raw_error=last_exc) from last_exc
            else:
                raise GeminiConfigurationError(f"Gemini API configuration or request error: {str(last_exc)}", raw_error=last_exc) from last_exc

        finally:
            _CONCURRENCY_SEMAPHORE.release()

    if dedup_key:
        return _DEDUPLICATOR.execute(dedup_key, _execute)
    else:
        return _execute()


# Backward Compatibility Export
client = get_genai_client

