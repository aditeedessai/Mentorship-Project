"""
backend.answer_evaluation.llm_judge

LLM-as-judge fallback for the two failure modes the statistical pipeline is
weakest on:

  1. Hallucination - a student answer that is fluent, on-topic, and uses
     plausible domain vocabulary but doesn't actually say anything the
     reference supports (or actively contradicts it). Embedding/cross-
     encoder similarity is easily fooled by vocabulary overlap here.
  2. Wrong logic - a student answer whose individual claims are true in
     isolation but whose reasoning/conclusion inverts or breaks the causal
     relationship the reference describes.

This module is deliberately NOT called on every answer - it's a targeted,
expensive fallback. evaluator.py decides *when* to call it (borderline
final-score band, concept/semantic divergence, negation-shift, the local
NLI model, or causal-language presence).

------------------------------------------------------------------------
ONE call, not two (quota fix)
------------------------------------------------------------------------
Both questions (contradiction/hallucination + causal-logic validity) are
asked in a SINGLE call with a combined JSON schema - one request per
escalated answer instead of two, to stay well under the free-tier rate
limit.

`check_entailment` / `check_logic` are kept as separate, single-purpose
functions (useful if you want to call just one of them directly), but
`judge_answer` - the function evaluator.py actually calls - uses the
merged single-call path by default.

------------------------------------------------------------------------
BACKEND: Google Gemini (cloud, default) OR Ollama (local, free, no limits)
------------------------------------------------------------------------
Two interchangeable backends, selected via LLM_JUDGE_BACKEND:

  LLM_JUDGE_BACKEND=gemini   (default)
    Requires a Gemini API key, set via either the GEMINI_API_KEY or
    GOOGLE_API_KEY environment variable (checked in that order). Put it
    in a .env file in the `backend` folder:

        GEMINI_API_KEY=your-key-here

    Model defaults to "gemini-3.6-flash" (override via JUDGE_MODEL_NAME).

  LLM_JUDGE_BACKEND=ollama   (fully local, free, open-source, no limits)
    Requires Ollama (https://ollama.com) installed and running locally
    with a model pulled:

        ollama pull qwen2.5:7b-instruct
        export LLM_JUDGE_BACKEND=ollama

Free-tier notes (gemini backend only):
  - Rate limit: client-side throttled via JUDGE_MIN_INTERVAL_SECONDS
    (default 4s between calls) to avoid 429s; set to 0 on a paid tier.
  - Truncated JSON: thinking tokens are minimized (thinking_level="low")
    and max_output_tokens is generous so the real JSON answer isn't cut
    off mid-string.

Speed on repeat calls (both backends): every verdict is cached to disk
(JUDGE_CACHE_PATH, default ".llm_judge_cache.json" inside this package's
folder) keyed on (backend, model, prompt, student answer, reference
answer). Re-grading the same answers a second time costs zero LLM calls.
Failed calls are never cached, so a transient error just gets retried on
the next run.
------------------------------------------------------------------------
"""

import os
import re
import json
import time
import logging

logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv, find_dotenv
    # find_dotenv() walks UP the directory tree starting from this file's
    # location (not just the process cwd), so it reliably finds
    # `backend/.env` regardless of where the server process was launched
    # from. usecwd=True adds the current working directory as a fallback
    # search root too.
    _dotenv_path = find_dotenv(usecwd=True)
    if not _dotenv_path:
        # Fallback: look explicitly one/two levels up from this file
        # (backend/answer_evaluation/llm_judge.py -> backend/.env).
        _here = os.path.dirname(os.path.abspath(__file__))
        for _candidate in (
            os.path.join(_here, "..", ".env"),
            os.path.join(_here, "..", "..", ".env"),
        ):
            if os.path.exists(_candidate):
                _dotenv_path = _candidate
                break
    if _dotenv_path:
        load_dotenv(_dotenv_path)
    else:
        load_dotenv()  # last resort: default search behavior
except ImportError:  # pragma: no cover
    # Not fatal: the key can still be set the normal way via a real shell
    # environment variable. Only .env-file loading is lost.
    # Run `pip install python-dotenv` to enable it.
    pass

_JUDGE_MODEL = os.environ.get("JUDGE_MODEL_NAME", "gemini-3.6-flash")
_MAX_OUTPUT_TOKENS = 800  # thinking tokens were eating a smaller budget
_MAX_RETRIES = 2

# 60/20=3s minimum between calls, plus a buffer. Override with
# JUDGE_MIN_INTERVAL_SECONDS=0 if you're on a paid tier / higher quota.
_MIN_CALL_INTERVAL_S = float(os.environ.get("JUDGE_MIN_INTERVAL_SECONDS", "4"))
_last_call_time = 0.0

# --- Persistent on-disk cache -------------------------------------------
# Re-running the same grading job repeatedly during development re-pays
# the full rate-limit tax every time for answers already judged
# identically before. Caching by a hash of (model, prompt, student,
# reference) means a second run against unchanged answers costs zero API
# calls and finishes in well under a second.
_DEFAULT_CACHE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".llm_judge_cache.json")
_CACHE_PATH = os.environ.get("JUDGE_CACHE_PATH", _DEFAULT_CACHE_PATH)
_CACHE_DISABLED = os.environ.get("JUDGE_DISABLE_CACHE", "").lower() in ("1", "true", "yes")
_cache = None  # lazy-loaded dict, persisted to _CACHE_PATH


def _load_cache() -> dict:
    global _cache
    if _cache is not None:
        return _cache
    if _CACHE_DISABLED:
        _cache = {}
        return _cache
    try:
        with open(_CACHE_PATH, "r", encoding="utf-8") as f:
            _cache = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        _cache = {}
    return _cache


def _save_cache():
    if _CACHE_DISABLED or _cache is None:
        return
    try:
        with open(_CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(_cache, f)
    except OSError as e:  # pragma: no cover
        logger.warning("llm_judge.py: could not write cache file (%s).", e)


def _cache_key(system_prompt: str, student_answer: str, reference_answer: str) -> str:
    import hashlib
    model_name = _OLLAMA_MODEL if _BACKEND == "ollama" else _JUDGE_MODEL
    raw = f"{_BACKEND}|{model_name}|{system_prompt}|{student_answer}|{reference_answer}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def clear_cache():
    """Deletes all cached verdicts (in memory and on disk). Call this if
    you change a prompt/threshold and want fresh judgments rather than
    stale cached ones from before the change."""
    global _cache
    _cache = {}
    try:
        os.remove(_CACHE_PATH)
    except FileNotFoundError:
        pass

# --- Backend selection ---------------------------------------------------
_BACKEND = os.environ.get("LLM_JUDGE_BACKEND", "gemini").lower()
_OLLAMA_MODEL = os.environ.get("OLLAMA_JUDGE_MODEL", "qwen2.5:7b-instruct")
_OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")

try:
    from google import genai
    from google.genai import types as genai_types
    _HAS_GENAI_SDK = True
except ImportError:  # pragma: no cover
    _HAS_GENAI_SDK = False
    if _BACKEND == "gemini":
        logger.warning(
            "llm_judge.py: 'google-genai' package not installed - the LLM-judge "
            "fallback will be skipped everywhere it's invoked. Run "
            "`pip install google-genai`, or switch to the free local backend "
            "with `LLM_JUDGE_BACKEND=ollama` in your .env."
        )

try:
    import requests as _requests
    _HAS_REQUESTS = True
except ImportError:  # pragma: no cover
    _HAS_REQUESTS = False

_client = None
_ollama_checked_available = None  # tri-state: None=not checked, True/False after


def _get_client():
    """Only meaningful for the gemini backend - ollama has no client object,
    just an HTTP endpoint checked separately (see _ollama_available)."""
    global _client
    if _BACKEND != "gemini":
        return None
    if _client is None:
        if not _HAS_GENAI_SDK:
            return None
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            logger.warning(
                "llm_judge.py: GEMINI_API_KEY / GOOGLE_API_KEY not set - "
                "LLM-judge fallback will be skipped. Add it to backend/.env."
            )
            return None
        _client = genai.Client(api_key=api_key)
    return _client


def _ollama_available() -> bool:
    global _ollama_checked_available
    if _ollama_checked_available is not None:
        return _ollama_checked_available
    if not _HAS_REQUESTS:
        logger.warning("llm_judge.py: 'requests' package not installed - required for the ollama backend.")
        _ollama_checked_available = False
        return False
    try:
        resp = _requests.get(f"{_OLLAMA_HOST}/api/tags", timeout=2)
        _ollama_checked_available = resp.status_code == 200
    except Exception:
        _ollama_checked_available = False
    if not _ollama_checked_available:
        logger.warning(
            "llm_judge.py: could not reach Ollama at %s - is it running? "
            "Install from https://ollama.com, then `ollama pull %s`.",
            _OLLAMA_HOST, _OLLAMA_MODEL,
        )
    return _ollama_checked_available


def is_available() -> bool:
    """Whether the LLM judge can actually be called (backend reachable)."""
    if _BACKEND == "ollama":
        return _ollama_available()
    return _get_client() is not None


def _throttle():
    """Client-side rate limiter to stay under the free-tier req/min cap."""
    global _last_call_time
    if _MIN_CALL_INTERVAL_S <= 0:
        return
    elapsed = time.monotonic() - _last_call_time
    wait = _MIN_CALL_INTERVAL_S - elapsed
    if wait > 0:
        time.sleep(wait)
    _last_call_time = time.monotonic()


_RETRY_SECONDS_RE = re.compile(r"retry in ([\d.]+)s", re.IGNORECASE)


def _seconds_to_wait_from_error(error: Exception) -> float:
    """Gemini's 429 body often includes 'Please retry in 43.9s' - use that
    hint if present rather than guessing a backoff duration."""
    match = _RETRY_SECONDS_RE.search(str(error))
    if match:
        try:
            return float(match.group(1)) + 1.0  # small buffer
        except ValueError:
            pass
    return _MIN_CALL_INTERVAL_S


_COMBINED_SYSTEM_PROMPT = """You are grading a student's answer against a reference answer for an \
academic question. You are answering two SEPARATE questions about the SAME student \
answer - do not let one influence the other. You are NOT grading writing quality, \
style, completeness, or brevity - those are handled elsewhere.

QUESTION 1 - Contradiction / hallucination: does the student's answer contradict the \
reference, or state a specific mechanism, cause, number, or relationship that is \
invented/fabricated rather than one that follows from or restates the reference? \
Plausible-sounding technical vocabulary used incorrectly still counts as hallucination \
even without an explicit contradiction. A reasonable paraphrase, partial answer, or \
different-but-compatible wording is NOT a contradiction or hallucination.

QUESTION 2 - Causal logic validity: if the student states a reasoning chain or causal \
claim (e.g. using "because", "therefore", "leads to"), is that causal direction \
actually consistent with the reference - or does it invert the relationship (claims X \
prevents something the reference says X causes), draw a conclusion that doesn't follow \
from its own stated premise, or reverse which of two things drives the other? A plain \
factual restatement with no explicit reasoning chain has no logic to break - mark it valid.

Respond with ONLY a JSON object (no prose, no markdown fences, no explanation outside \
the JSON) in exactly this shape:
{"contradicts_reference": <true|false>, "hallucinated_claim": <true|false>, "logic_valid": <true|false>, "reasoning": "<one to three sentences covering both questions>"}"""


def _generate_with_retry(system_prompt: str, user_prompt: str, max_output_tokens: int = None) -> str:
    """
    Backend-dispatching generate call with 429 retry/backoff (gemini) and
    the free-tier client-side throttle applied once per call - shared by
    both the single-item and batched judge paths. Raises on failure after
    retries are exhausted (caller decides how to handle that).
    """
    last_error = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            if _BACKEND == "ollama":
                # Local model: no network rate limit, so no throttle needed.
                return _generate_ollama(system_prompt, user_prompt, max_output_tokens)
            else:
                _throttle()
                return _generate(_get_client(), system_prompt, user_prompt, max_output_tokens)
        except Exception as e:
            last_error = e
            is_rate_limit = _BACKEND == "gemini" and ("429" in str(e) or "too_many_requests" in str(e).lower())
            if is_rate_limit and attempt < _MAX_RETRIES:
                wait_s = _seconds_to_wait_from_error(e)
                logger.warning(
                    "llm_judge.py: rate limited (attempt %d/%d); retrying in %.1fs.",
                    attempt + 1, _MAX_RETRIES, wait_s,
                )
                time.sleep(wait_s)
                continue
            break
    raise last_error


def _call_judge(system_prompt: str, student_answer: str, reference_answer: str) -> dict:
    if _BACKEND == "ollama":
        if not _ollama_available():
            return {"available": False, "error": "ollama_unavailable"}
    else:
        if _get_client() is None:
            return {"available": False, "error": "llm_judge_unavailable"}

    cache = _load_cache()
    key = _cache_key(system_prompt, student_answer, reference_answer)
    if key in cache:
        return cache[key]

    user_prompt = (
        f"Reference answer:\n{reference_answer}\n\n"
        f"Student answer:\n{student_answer}"
    )

    try:
        raw_text = _generate_with_retry(system_prompt, user_prompt)
        raw_text = (raw_text or "").strip().strip("`")
        if raw_text.lower().startswith("json"):
            raw_text = raw_text[4:].strip()

        parsed = json.loads(raw_text)
        parsed["available"] = True
        cache[key] = parsed
        _save_cache()
        return parsed
    except Exception as e:
        logger.warning("llm_judge.py: judge call failed (%s); skipping override.", e)
        # Deliberately NOT cached: a transient failure shouldn't
        # permanently poison the cache - the next run should retry it.
        return {"available": False, "error": str(e)}


def _generate_ollama(system_prompt: str, user_prompt: str, max_output_tokens: int = None) -> str:
    """
    Calls a locally-running Ollama server. Free, open-source, no API key,
    no rate limit - the only constraint is your machine's compute. Uses
    Ollama's JSON mode (format="json") for the same structured-output
    guarantee the Gemini path gets from response_mime_type.
    """
    response = _requests.post(
        f"{_OLLAMA_HOST}/api/chat",
        json={
            "model": _OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "format": "json",
            "stream": False,
            "options": {"temperature": 0.0, "num_predict": max_output_tokens or _MAX_OUTPUT_TOKENS},
        },
        timeout=180,
    )
    response.raise_for_status()
    return response.json()["message"]["content"]


def _generate(client, system_prompt: str, user_prompt: str, max_output_tokens: int = None) -> str:
    """
    Calls Gemini and returns the raw text response. Tries the newer
    Interactions API first and falls back to the older
    `client.models.generate_content` if the installed google-genai SDK
    version doesn't have `interactions` yet.

    thinking_level is set to "low" (Interactions API) / a minimal
    ThinkingConfig (fallback path) so internal reasoning tokens don't eat
    into max_output_tokens and truncate the actual JSON response.
    """
    max_output_tokens = max_output_tokens or _MAX_OUTPUT_TOKENS
    if hasattr(client, "interactions"):
        interaction = client.interactions.create(
            model=_JUDGE_MODEL,
            input=user_prompt,
            system_instruction=system_prompt,
            response_format={"type": "text", "mime_type": "application/json"},
            generation_config={
                "temperature": 0.0,
                "max_output_tokens": max_output_tokens,
                "thinking_level": "low",
            },
        )
        return interaction.output_text

    # Fallback for older SDK versions still on models.generate_content.
    config_kwargs = dict(
        system_instruction=system_prompt,
        max_output_tokens=max_output_tokens,
        response_mime_type="application/json",
        temperature=0.0,
    )
    try:
        config_kwargs["thinking_config"] = genai_types.ThinkingConfig(thinking_level="low")
    except Exception:  # pragma: no cover - older SDKs may not have ThinkingConfig
        pass

    response = client.models.generate_content(
        model=_JUDGE_MODEL,
        contents=user_prompt,
        config=genai_types.GenerateContentConfig(**config_kwargs),
    )
    return response.text


def check_entailment(student_answer: str, reference_answer: str) -> dict:
    """
    Standalone entailment/hallucination-only check (1 API call). Prefer
    `judge_answer` for normal use - it covers both questions in a single
    call and is what evaluator.py actually calls.
    """
    prompt = (
        "You are grading whether a student's answer contradicts or hallucinates "
        "beyond a reference answer. Respond with ONLY JSON:\n"
        '{"contradicts_reference": <true|false>, "hallucinated_claim": <true|false>, "reasoning": "<1-2 sentences>"}'
    )
    return _call_judge(prompt, student_answer, reference_answer)


def check_logic(student_answer: str, reference_answer: str) -> dict:
    """
    Standalone causal-logic-only check (1 API call). Prefer `judge_answer`
    for normal use - it covers both questions in a single call and is
    what evaluator.py actually calls.
    """
    prompt = (
        "You are grading whether a student's stated causal reasoning is valid relative "
        "to a reference answer. Respond with ONLY JSON:\n"
        '{"logic_valid": <true|false>, "reasoning": "<1-2 sentences>"}'
    )
    return _call_judge(prompt, student_answer, reference_answer)


def judge_answer(student_answer: str, reference_answer: str) -> dict:
    """
    Single-call combined verdict (contradiction + hallucination + logic
    validity all in one request) - used by evaluate_answer() for one-off
    single-item grading. For grading many answers at once, prefer
    judge_batch() - it's what evaluate_answers_batch() calls.
    `override_to_incorrect` is the actionable field: True means the judge
    call succeeded and found a contradiction, a hallucinated claim, or
    invalid logic.
    """
    result = _call_judge(_COMBINED_SYSTEM_PROMPT, student_answer, reference_answer)
    return _to_verdict(result)


# ---------------------------------------------------------------------
# Batched judging - the main speed fix for bulk runs
# ---------------------------------------------------------------------
_BATCH_SIZE = int(os.environ.get("JUDGE_BATCH_SIZE", "25"))
_BATCH_TOKENS_PER_ITEM = 220

_BATCH_SYSTEM_PROMPT = _COMBINED_SYSTEM_PROMPT + """

You will be given MULTIPLE numbered student/reference pairs in one request. Answer \
both questions for EACH pair independently - do not let one pair's answer influence \
another's. Respond with ONLY a JSON array (no prose, no markdown fences), with exactly \
one object per pair IN THE SAME ORDER they were given, each shaped like:
{"contradicts_reference": <true|false>, "hallucinated_claim": <true|false>, "logic_valid": <true|false>, "reasoning": "<1-2 sentences>"}
The array must have exactly as many objects as there were pairs."""


def _build_batch_prompt(pairs: list) -> str:
    parts = []
    for i, (student, reference) in enumerate(pairs, 1):
        parts.append(
            f"--- Pair {i} ---\nReference answer:\n{reference}\n\nStudent answer:\n{student}"
        )
    return "\n\n".join(parts)


def judge_batch(pairs: list) -> list:
    """
    Judges many (student_answer, reference_answer) pairs with as few API
    calls as possible: already-cached pairs cost nothing, and the rest go
    out in chunks of JUDGE_BATCH_SIZE as single combined requests.

    Args:
        pairs: list of (student_answer, reference_answer) tuples.

    Returns:
        list of verdict dicts, same shape as judge_answer()'s return, in
        the same order as `pairs`.
    """
    if not pairs:
        return []

    if _BACKEND == "ollama":
        backend_ready = _ollama_available()
    else:
        backend_ready = _get_client() is not None

    cache = _load_cache()
    results = [None] * len(pairs)
    uncached_indices = []

    for i, (student, reference) in enumerate(pairs):
        key = _cache_key(_COMBINED_SYSTEM_PROMPT, student, reference)
        if key in cache:
            results[i] = cache[key]
        else:
            uncached_indices.append(i)

    if not backend_ready:
        for i in uncached_indices:
            results[i] = {"available": False, "error": "llm_judge_unavailable"}
        return [_to_verdict(r) for r in results]

    for chunk_start in range(0, len(uncached_indices), _BATCH_SIZE):
        chunk_indices = uncached_indices[chunk_start:chunk_start + _BATCH_SIZE]
        chunk_pairs = [pairs[i] for i in chunk_indices]
        user_prompt = _build_batch_prompt(chunk_pairs)
        max_tokens = _BATCH_TOKENS_PER_ITEM * len(chunk_pairs)

        try:
            raw_text = _generate_with_retry(_BATCH_SYSTEM_PROMPT, user_prompt, max_output_tokens=max_tokens)
            raw_text = (raw_text or "").strip().strip("`")
            if raw_text.lower().startswith("json"):
                raw_text = raw_text[4:].strip()
            parsed_array = json.loads(raw_text)

            if not isinstance(parsed_array, list) or len(parsed_array) != len(chunk_pairs):
                raise ValueError(
                    f"expected a JSON array of {len(chunk_pairs)} verdicts, "
                    f"got {type(parsed_array).__name__} of length "
                    f"{len(parsed_array) if isinstance(parsed_array, list) else 'n/a'}"
                )

            for idx, verdict, (student, reference) in zip(chunk_indices, parsed_array, chunk_pairs):
                verdict = dict(verdict)
                verdict["available"] = True
                results[idx] = verdict
                cache[_cache_key(_COMBINED_SYSTEM_PROMPT, student, reference)] = verdict
            _save_cache()
        except Exception as e:
            logger.warning(
                "llm_judge.py: batch judge call failed for %d pairs (%s); "
                "those items skip the override.", len(chunk_pairs), e,
            )
            for idx in chunk_indices:
                results[idx] = {"available": False, "error": str(e)}

    return [_to_verdict(r) for r in results]


def _to_verdict(result: dict) -> dict:
    """Normalizes a raw judge result (single or batch) into the public
    verdict shape returned by judge_answer/judge_batch."""
    available = result.get("available", False)
    contradicts = bool(result.get("contradicts_reference")) if available else False
    hallucinated = bool(result.get("hallucinated_claim")) if available else False
    logic_invalid = (result.get("logic_valid") is False) if available else False

    return {
        "judge_available": available,
        "contradicts_reference": contradicts if available else None,
        "hallucinated_claim": hallucinated if available else None,
        "logic_valid": result.get("logic_valid") if available else None,
        "reasoning": result.get("reasoning") if available else result.get("error"),
        "override_to_incorrect": contradicts or hallucinated or logic_invalid,
    }