"""
backend.quiz_generation.gemini_retry

One shared "call Gemini, get JSON back" helper used by every generator
(quiz, summary, flashcards, mnemonics).

WHY THIS EXISTS
---------------
Every generator used to call `client.models.generate_content(...)` once,
then `json.loads()` the text, with no retry at all. Gemini fails
transiently all the time - 503 "model is overloaded", 504 deadline
exceeded on big prompts, a per-MINUTE 429, or a reply that comes back
empty / wrapped in prose so it doesn't parse. One blip = a failed request
to the user, and clicking the button again "magically" worked because the
second call simply landed on a healthy moment.

This helper retries ONLY the failures that are actually worth retrying,
with short exponential backoff, and fails fast on the ones that aren't
(daily quota exhausted, bad key, unknown model, invalid request) so a
real problem is never hidden behind 40 seconds of pointless waiting.

Deliberately has NO import-time side effects (no API key check, no
dotenv) so it can be unit-tested in isolation - the client and model
name are passed in by the caller.
"""

import json
import os
import random
import re
import time


# Total tries per call (1 first attempt + retries).
MAX_ATTEMPTS = int(os.environ.get("GEMINI_MAX_ATTEMPTS", "3"))
# Backoff: BASE * 2^(attempt-1) seconds (+ small jitter), capped at MAX_DELAY.
BASE_DELAY_S = float(os.environ.get("GEMINI_RETRY_BASE_DELAY", "2"))
MAX_DELAY_S = float(os.environ.get("GEMINI_RETRY_MAX_DELAY", "15"))
# Optional: if the primary model keeps answering 503/504 ("high demand"),
# the retries switch to this one. Unset = no fallback.
FALLBACK_MODEL = os.environ.get("GEMINI_FALLBACK_MODEL", "").strip() or None

_TRANSIENT_STATUS = {408, 429, 500, 502, 503, 504}
_TRANSIENT_MARKERS = (
    "unavailable",
    "overloaded",
    "high demand",
    "deadline_exceeded",
    "deadline exceeded",
    "timed out",
    "timeout",
    "connection reset",
    "connection aborted",
    "server disconnected",
    "remote end closed",
    "temporarily",
)


class GeminiResponseError(RuntimeError):
    """Gemini answered, but the reply was empty or not usable JSON."""


def _status_code(exc: Exception):
    """HTTP status of a google-genai APIError, or None if there isn't one."""
    for attr in ("code", "status_code"):
        val = getattr(exc, attr, None)
        if isinstance(val, int) and not isinstance(val, bool):
            return val
    # google-genai formats str(APIError) as "<code> <STATUS>. <details>"
    m = re.match(r"\s*(\d{3})\b", str(exc))
    return int(m.group(1)) if m else None


def _is_daily_or_zero_quota(msg_lower: str) -> bool:
    """
    A 429 that will NOT clear in a few seconds: the per-day quota is spent
    (GenerateRequestsPerDayPerProjectPerModel) or the model has a free-tier
    limit of 0 for this project. Retrying just burns time.
    """
    return (
        "perday" in msg_lower
        or "per day" in msg_lower
        or "limit: 0" in msg_lower
    )


def _retry_delay_hint(exc: Exception):
    """Seconds Gemini asked us to wait (from its 429 body), else None."""
    msg = str(exc)
    m = re.search(r"retry in ([\d.]+)\s*s", msg, re.IGNORECASE)
    if not m:
        m = re.search(r"retryDelay['\"]?\s*:\s*['\"]?([\d.]+)s", msg)
    return float(m.group(1)) if m else None


def is_retryable(exc: Exception) -> bool:
    if isinstance(exc, GeminiResponseError):
        return True  # empty / unparseable reply - a fresh sample usually fixes it

    msg = str(exc).lower()
    status = _status_code(exc)

    if status == 429:
        if _is_daily_or_zero_quota(msg):
            return False
        hint = _retry_delay_hint(exc)
        # If Gemini says "come back in 43s", blocking a request thread that
        # long isn't worth it - surface the error instead.
        return hint is None or hint <= MAX_DELAY_S

    if status in _TRANSIENT_STATUS:
        return True
    if status is not None:
        return False  # 400 / 401 / 403 / 404 ...: retrying can't help

    # No HTTP status at all: network-level failures.
    if isinstance(exc, (TimeoutError, ConnectionError)):
        return True
    return any(marker in msg for marker in _TRANSIENT_MARKERS)


def _delay_for(attempt: int, exc: Exception) -> float:
    hint = _retry_delay_hint(exc)
    if hint is not None:
        return min(hint + 0.5, MAX_DELAY_S)
    backoff = BASE_DELAY_S * (2 ** (attempt - 1))
    return min(backoff + random.uniform(0, 0.5), MAX_DELAY_S)


def parse_json_response(text):
    """
    Turns Gemini's text into Python data. Tolerates ```json fences and
    leading/trailing prose; raises GeminiResponseError if nothing parses.
    """
    if text is None or not str(text).strip():
        raise GeminiResponseError("Gemini returned an empty response")

    cleaned = str(text).strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Last resort: slice from the first opening brace/bracket to the last
    # closing one (handles "Here is your quiz: {...}" style replies).
    starts = [i for i in (cleaned.find("{"), cleaned.find("[")) if i != -1]
    ends = [i for i in (cleaned.rfind("}"), cleaned.rfind("]")) if i != -1]
    if starts and ends and min(starts) < max(ends):
        try:
            return json.loads(cleaned[min(starts): max(ends) + 1])
        except json.JSONDecodeError:
            pass

    preview = cleaned[:300].replace("\n", " ")
    raise GeminiResponseError(
        f"Gemini reply was not valid JSON (length={len(cleaned)}): {preview}"
    )


def generate_json_with_retry(
    client,
    model: str,
    prompt: str,
    label: str = "gemini",
    required_key: str | None = None,
):
    """
    Calls `client.models.generate_content`, parses the reply as JSON and
    returns the parsed data. Retries transient API errors and unusable
    replies up to MAX_ATTEMPTS times; re-raises the last error otherwise.

    `required_key`: if set and the parsed reply is a dict without it (or a
    bare list, which is wrapped under it), the reply counts as unusable.
    """
    attempt = 0
    while True:
        attempt += 1
        try:
            response = client.models.generate_content(model=model, contents=prompt)
            data = parse_json_response(getattr(response, "text", None))

            if required_key:
                if isinstance(data, list):
                    data = {required_key: data}
                if not isinstance(data, dict) or required_key not in data:
                    raise GeminiResponseError(
                        f"Gemini reply is missing the '{required_key}' field"
                    )
            return data

        except Exception as exc:
            if attempt >= MAX_ATTEMPTS or not is_retryable(exc):
                print(
                    f"[{label}] Gemini call failed (attempt {attempt}/{MAX_ATTEMPTS}, "
                    f"model={model}): {type(exc).__name__}: {str(exc)[:300]}"
                )
                raise
            if (
                FALLBACK_MODEL
                and model != FALLBACK_MODEL
                and _status_code(exc) in (503, 504)
            ):
                print(f"[{label}] {model} is overloaded - switching to fallback model {FALLBACK_MODEL}")
                model = FALLBACK_MODEL
            delay = _delay_for(attempt, exc)
            print(
                f"[{label}] transient Gemini failure (attempt {attempt}/{MAX_ATTEMPTS}, "
                f"model={model}): {type(exc).__name__}: {str(exc)[:200]} "
                f"- retrying in {delay:.1f}s"
            )
            time.sleep(delay)
