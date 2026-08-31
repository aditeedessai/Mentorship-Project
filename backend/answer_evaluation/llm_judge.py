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
academic question. You are answering THREE SEPARATE questions about the SAME student \
answer - do not let one influence the others. You are NOT grading writing quality, \
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

QUESTION 3 - Coherence: is the student's answer a coherent, real attempt to answer the \
question - an actual claim or assertion, however short, terse, or informally worded - \
rather than scrambled/garbled text, disconnected keyword fragments, or a sequence of \
words with no real assertion being made? A short, terse, list-style, or even \
ungrammatical answer can still be coherent - judge whether it expresses a real, \
connected idea, not whether it is a complete or polished sentence. Mark \
is_coherent_claim = false ONLY when the text genuinely fails to express any real \
assertion (e.g. scrambled/garbled words, random fragments strung together, text that \
reads as nonsense even after allowing for typos and informal phrasing).

Respond with ONLY a JSON object (no prose, no markdown fences, no explanation outside \
the JSON) in exactly this shape:
{"contradicts_reference": <true|false>, "hallucinated_claim": <true|false>, "logic_valid": <true|false>, "is_coherent_claim": <true|false>, "reasoning": "<one to three sentences covering all three questions>"}"""


def _generate_with_retry(
    system_prompt: str,
    user_prompt: str,
    max_output_tokens: int = None,
    timing: dict = None,
    thinking_budget: int = None,
) -> str:
    """
    Backend-dispatching generate call with 429 retry/backoff (gemini) and
    the free-tier client-side throttle applied once per call - shared by
    both the single-item and batched judge paths. Raises on failure after
    retries are exhausted (caller decides how to handle that).

    `timing`: optional dict to record per-attempt profiling into (see
    _call_judge's TIMING log line) - purely additive/observational, never
    read back to make any decision here. When None (e.g. judge_batch()'s
    call site, which doesn't pass it), this function's behavior is
    byte-for-byte the same as before this instrumentation was added.

    `thinking_budget`: forwarded to _generate() - see its docstring.
    Left None by every call site except judge_batch()'s, so this changes
    nothing for the single-item path.
    """
    last_error = None
    for attempt in range(_MAX_RETRIES + 1):
        attempt_num = attempt + 1
        throttle_ms = 0.0
        network_start = None
        try:
            if _BACKEND == "ollama":
                # Local model: no network rate limit, so no throttle needed.
                network_start = time.perf_counter()
                result = _generate_ollama(system_prompt, user_prompt, max_output_tokens)
            else:
                throttle_start = time.perf_counter()
                _throttle()
                throttle_ms = round((time.perf_counter() - throttle_start) * 1000, 3)
                network_start = time.perf_counter()
                result = _generate(
                    _get_client(), system_prompt, user_prompt, max_output_tokens, thinking_budget=thinking_budget
                )
            network_ms = round((time.perf_counter() - network_start) * 1000, 3)
            if timing is not None:
                timing.setdefault("attempts", []).append({
                    "attempt": attempt_num, "throttle_ms": throttle_ms,
                    "network_ms": network_ms, "outcome": "success",
                })
            return result
        except Exception as e:
            last_error = e
            network_ms = round((time.perf_counter() - network_start) * 1000, 3) if network_start is not None else 0.0
            is_rate_limit = _BACKEND == "gemini" and ("429" in str(e) or "too_many_requests" in str(e).lower())
            if is_rate_limit and attempt < _MAX_RETRIES:
                wait_s = _seconds_to_wait_from_error(e)
                logger.warning(
                    "llm_judge.py: rate limited (attempt %d/%d); retrying in %.1fs.",
                    attempt + 1, _MAX_RETRIES, wait_s,
                )
                backoff_start = time.perf_counter()
                time.sleep(wait_s)
                backoff_ms = round((time.perf_counter() - backoff_start) * 1000, 3)
                if timing is not None:
                    timing.setdefault("attempts", []).append({
                        "attempt": attempt_num, "throttle_ms": throttle_ms, "network_ms": network_ms,
                        "outcome": f"rate_limited (retry_after={wait_s:.1f}s)", "backoff_ms": backoff_ms,
                    })
                continue
            if timing is not None:
                timing.setdefault("attempts", []).append({
                    "attempt": attempt_num, "throttle_ms": throttle_ms,
                    "network_ms": network_ms, "outcome": f"error: {e}",
                })
            break
    raise last_error


def _log_judge_call_timing(timing: dict, call_start: float, outcome: str) -> None:
    """
    Single combined TIMING log line per judge call - same
    time.perf_counter() + logger.info() pattern used in evaluator.py's
    per-stage instrumentation, not a different logging approach. Each
    retry attempt's own duration is shown individually within this one
    line (not as separate scattered log lines, and not collapsed into
    just a combined total), since a hidden retry loop is one of the most
    likely explanations for an unusually long call.
    """
    total_ms = round((time.perf_counter() - call_start) * 1000, 3)
    attempts = timing.get("attempts", [])
    attempts_str = " | ".join(
        f"attempt{a['attempt']}(throttle={a['throttle_ms']:.1f}ms network={a['network_ms']:.1f}ms "
        f"{a['outcome']}" + (f" backoff={a['backoff_ms']:.1f}ms" if "backoff_ms" in a else "") + ")"
        for a in attempts
    )
    logger.info(
        "llm_judge.py: TIMING total=%.1fms prompt_build=%.1fms [%s] parse=%.1fms outcome=%s",
        total_ms,
        timing.get("prompt_build_ms", 0.0),
        attempts_str or "no attempts recorded",
        timing.get("parse_ms", 0.0),
        outcome,
    )


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

    call_start = time.perf_counter()
    timing = {"attempts": []}

    prompt_build_start = time.perf_counter()
    user_prompt = (
        f"Reference answer:\n{reference_answer}\n\n"
        f"Student answer:\n{student_answer}"
    )
    timing["prompt_build_ms"] = round((time.perf_counter() - prompt_build_start) * 1000, 3)

    try:
        raw_text = _generate_with_retry(system_prompt, user_prompt, timing=timing)

        parse_start = time.perf_counter()
        raw_text = (raw_text or "").strip().strip("`")
        if raw_text.lower().startswith("json"):
            raw_text = raw_text[4:].strip()

        parsed = json.loads(raw_text)
        timing["parse_ms"] = round((time.perf_counter() - parse_start) * 1000, 3)

        parsed["available"] = True
        cache[key] = parsed
        _save_cache()
        _log_judge_call_timing(timing, call_start, outcome="success")
        return parsed
    except Exception as e:
        logger.warning("llm_judge.py: judge call failed (%s); skipping override.", e)
        _log_judge_call_timing(timing, call_start, outcome=f"failed: {e}")
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


def _generate(
    client, system_prompt: str, user_prompt: str, max_output_tokens: int = None, thinking_budget: int = None
) -> str:
    """
    Calls Gemini and returns the raw text response. Tries the newer
    Interactions API first and falls back to the older
    `client.models.generate_content` if the installed google-genai SDK
    version doesn't have `interactions` yet.

    thinking_level is set to "low" below for the DEFAULT (thinking_budget
    left None) case, matching this function's original behavior - but
    that line does NOT actually suppress thinking in this environment.
    Confirmed directly: this installed google-genai SDK version's
    ThinkingConfig has no "thinking_level" field at all (only
    "thinking_budget" / "include_thoughts"), so
    ThinkingConfig(thinking_level="low") raises a pydantic
    ValidationError every time, which the bare except below silently
    swallows - meaning thinking_config is never actually set on the
    default path, and Gemini has been using its own uncontrolled default
    thinking budget the whole time, not a "low" one as the comment
    previously (incorrectly) claimed. Left exactly as-is here rather than
    fixed, so judge_answer()'s real-world behavior doesn't change.

    `thinking_budget`: optional explicit override using ThinkingConfig's
    REAL field - used by judge_batch() specifically, where a shared,
    fixed per-request token budget across multiple verdicts makes
    uncontrolled thinking token usage the likely cause of truncated/
    unparseable responses (confirmed via the raw response text logged in
    judge_batch()'s except block: responses were cut off mid-object, not
    malformed). NOTE: this field's own docstring says "0 is DISABLED",
    but that's not actually accepted by every model - confirmed via a
    live call that _JUDGE_MODEL (gemini-3.6-flash) rejects
    thinking_budget=0 outright (400 INVALID_ARGUMENT), while 1 (and any
    larger value, and -1/automatic) is accepted. judge_batch() passes 1
    - the smallest budget this model will actually take - rather than 0.
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
    if thinking_budget is not None:
        try:
            config_kwargs["thinking_config"] = genai_types.ThinkingConfig(thinking_budget=thinking_budget)
        except Exception:  # pragma: no cover - older SDKs may not have ThinkingConfig
            pass
    else:
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
# Self-consistency polling - judge_answer() replacement for evaluate_answer()
# ---------------------------------------------------------------------
# Confirmed via repeated live testing (2026-08-31, the "btirhs delasiph
# ustm..." keyword-salad case): the SAME combined judge call, on the SAME
# inputs, can occasionally return a clean verdict for text that plainly
# isn't a coherent claim at all - real server-side non-determinism in
# hosted LLM inference (temperature=0.0 does not guarantee determinism -
# floating-point non-associativity across variable server-side batch
# composition can still flip a close decision), not a prompt-wording
# problem. A single sample can never be fully trusted, so
# evaluate_answer() now asks the same question POLL_COUNT times (see
# evaluator.py) instead of once.
_POLL_COUNT = 3
# Bumped from _BATCH_TOKENS_PER_ITEM (350) since each poll vote now has
# 4 fields instead of 3 (added is_coherent_claim) - re-verified via live
# testing (raw response text shown across repeated trials), not just
# incremented blindly, the same way _BATCH_TOKENS_PER_ITEM's value was
# verified earlier today.
_POLL_TOKENS_PER_ITEM = 400


def judge_answer_polled(student_answer: str, reference_answer: str, poll_count: int = _POLL_COUNT) -> dict:
    """
    Self-consistency polling: asks the combined judge question
    `poll_count` times for the SAME (student_answer, reference_answer)
    pair, batched into ONE network request (poll_count copies of the
    same pair, sent the same way judge_batch() sends genuinely different
    pairs) rather than trusting a single probabilistic sample.

    Returns MECHANICAL vote data only - no rescue/penalty/ambiguous
    decision is made here. See evaluator.py's POLL_PENALTY_MIN_FLAGGED_VOTES
    and _finalize_result for how clean_count/flagged_count become an
    actual score adjustment - deliberately kept there, alongside every
    other scoring threshold in this codebase, rather than duplicated here.

    Does NOT use the persistent on-disk verdict cache the way
    judge_answer()/judge_batch() do - polling exists specifically to get
    FRESH independent samples every time it's called; caching a single
    aggregate result would silently defeat the entire point on a re-grade.

    Returns: {"judge_available": bool, "votes": list[dict], "poll_count": int,
    "clean_count": int, "flagged_count": int}. Each vote dict has
    contradicts_reference / hallucinated_claim / logic_valid /
    is_coherent_claim / reasoning / flagged (flagged = this ONE vote
    found ANY problem). judge_available=False (network/parse failure)
    returns clean_count=0, flagged_count=0, votes=[] - the caller treats
    this as ambiguous, the same as a 1-of-3 split: never an automatic
    rescue, never an automatic penalty.
    """
    if _BACKEND == "ollama":
        backend_ready = _ollama_available()
    else:
        backend_ready = _get_client() is not None

    if not backend_ready:
        return {"judge_available": False, "votes": [], "poll_count": poll_count, "clean_count": 0, "flagged_count": 0}

    pairs = [(student_answer, reference_answer)] * poll_count
    user_prompt = _build_batch_prompt(pairs)
    max_tokens = _POLL_TOKENS_PER_ITEM * poll_count

    try:
        # thinking_budget=1: same reasoning as judge_batch() - frees up
        # real budget for the actual JSON content. Not 0 - this model
        # rejects that value outright (see judge_batch()'s comment).
        raw_text = _generate_with_retry(
            _BATCH_SYSTEM_PROMPT, user_prompt, max_output_tokens=max_tokens, thinking_budget=1
        )
        cleaned_text = (raw_text or "").strip().strip("`")
        if cleaned_text.lower().startswith("json"):
            cleaned_text = cleaned_text[4:].strip()
        parsed_array = json.loads(cleaned_text)

        if not isinstance(parsed_array, list) or len(parsed_array) != poll_count:
            raise ValueError(
                f"expected a JSON array of {poll_count} poll verdicts, "
                f"got {type(parsed_array).__name__} of length "
                f"{len(parsed_array) if isinstance(parsed_array, list) else 'n/a'}"
            )
    except Exception as e:
        logger.warning(
            "llm_judge.py: polled judge call failed (%s); treating as ambiguous (no rescue, no penalty).", e,
        )
        return {"judge_available": False, "votes": [], "poll_count": poll_count, "clean_count": 0, "flagged_count": 0}

    votes = [_to_poll_vote(v) for v in parsed_array]
    flagged_count = sum(1 for v in votes if v["flagged"])
    clean_count = poll_count - flagged_count

    return {
        "judge_available": True,
        "votes": votes,
        "poll_count": poll_count,
        "clean_count": clean_count,
        "flagged_count": flagged_count,
    }


def _to_poll_vote(raw_vote: dict) -> dict:
    """
    One individual poll sample's normalized vote. `flagged` = this ONE
    vote found ANY problem (contradiction, hallucination, invalid logic,
    or incoherence) - separate from _to_verdict()'s override_to_incorrect
    (judge_answer()'s single-shot shape), since a poll vote is only ever
    aggregated with its siblings, never used to make a decision alone.
    """
    contradicts = bool(raw_vote.get("contradicts_reference"))
    hallucinated = bool(raw_vote.get("hallucinated_claim"))
    logic_invalid = raw_vote.get("logic_valid") is False
    incoherent = raw_vote.get("is_coherent_claim") is False
    return {
        "contradicts_reference": contradicts,
        "hallucinated_claim": hallucinated,
        "logic_valid": raw_vote.get("logic_valid"),
        "is_coherent_claim": raw_vote.get("is_coherent_claim"),
        "reasoning": raw_vote.get("reasoning"),
        "flagged": contradicts or hallucinated or logic_invalid or incoherent,
    }


# ---------------------------------------------------------------------
# Completeness judge - a DIFFERENT question from judge_answer() above
# ---------------------------------------------------------------------
# judge_answer()'s three questions are designed to catch a well-formed
# answer being subtly WRONG (contradicts, hallucinates, or breaks its own
# causal logic). They say nothing about whether an answer that ISN'T
# wrong is actually COMPLETE - a student answer can be true, non-
# contradictory, and still under-cover the reference, or it can be a
# complete, fully correct restatement using entirely different wording,
# structure, or a terse/list-style phrasing the cross-encoder under-
# rewards. evaluator.py's COMPLETENESS_* escalation trigger exists
# specifically for the second case (a confidently-scored, high-concept-
# coverage answer that never reaches judge_answer() at all, because
# nothing about it looks wrong - it's just under-scored) - so it needs
# its own question, asked here rather than by repurposing judge_answer().
_COMPLETENESS_SYSTEM_PROMPT = """You are grading whether a student's answer, even though possibly worded \
very differently from a reference answer, is FULLY and CORRECTLY complete relative to what \
the reference describes. This is a DIFFERENT question from contradiction, hallucination, or \
logic-validity - a student answer can be true and non-contradictory and still be INCOMPLETE \
(missing required parts of the reference), or it can be a complete, fully correct restatement \
using entirely different words, structure, or a terse/list-style phrasing instead of full \
sentences. Judge substance only - never penalize for style, wording, structure, or brevity.

Mark fully_correct = true ONLY if the student's answer, taken as a whole, covers every \
essential point the reference answer makes (a reasonable paraphrase, reordering, or more \
concise phrasing is fine, as long as nothing substantive from the reference is missing or \
wrong). If the reference explicitly allows a subset (e.g. it says "any two", "for example", \
or "such as"), an answer satisfying that explicit subset requirement still counts as fully \
correct - do not require it to cover every option listed. Mark fully_correct = false if any \
required part of the reference's content is missing, wrong, or only partially covered.

Respond with ONLY a JSON object (no prose, no markdown fences, no explanation outside the \
JSON) in exactly this shape:
{"fully_correct": <true|false>, "reasoning": "<one short sentence>"}"""


def judge_completeness(student_answer: str, reference_answer: str) -> dict:
    """
    Standalone completeness check (1 API call, its own cache namespace via
    _COMPLETENESS_SYSTEM_PROMPT - distinct from judge_answer()'s cache
    entries for the same pair). Used by evaluator.py's narrow completeness-
    rescue trigger (see COMPLETENESS_* constants there) for answers whose
    statistical score already sits confidently above the ordinary
    borderline escalation band - so judge_answer()'s three questions were
    never going to be asked - but still fall well short of full marks,
    purely because the statistical pipeline under-rewards different
    phrasing, structure, or an "any N of M"-style reference answer.
    """
    result = _call_judge(_COMPLETENESS_SYSTEM_PROMPT, student_answer, reference_answer)
    return _to_completeness_verdict(result)


def _to_completeness_verdict(result: dict) -> dict:
    """
    Normalizes a raw judge result into the completeness verdict shape.
    Deliberately separate from _to_verdict() (judge_answer()'s shape,
    which has contradicts_reference/hallucinated_claim/logic_valid/
    override_to_incorrect) - this is a different question with a
    different schema (just "fully_correct"), and has no
    override_to_incorrect-style field at all: see evaluator.py's
    _finalize_result for why a completeness verdict is only ever allowed
    to raise a score, never lower one.
    """
    available = result.get("available", False)
    fully_correct = bool(result.get("fully_correct")) if available else False
    return {
        "judge_available": available,
        "fully_correct": fully_correct if available else None,
        "reasoning": result.get("reasoning") if available else result.get("error"),
    }


# ---------------------------------------------------------------------
# Batched judging - the main speed fix for bulk runs
# ---------------------------------------------------------------------
_BATCH_SIZE = int(os.environ.get("JUDGE_BATCH_SIZE", "25"))

# Confirmed root cause of intermittent truncated/unparseable batch
# responses (see judge_batch()'s except block, which logs the raw text):
# 220 tokens/item left no real headroom once uncontrolled thinking
# tokens (see _generate()'s docstring - thinking was never actually
# suppressed) and a "1-2 sentences" reasoning field competed for the
# same fixed per-request budget. Two things change together to fix this:
#   1. judge_batch() now passes thinking_budget=1 to _generate_with_retry
#      (working minimization this time, unlike the broken thinking_level
#      attempt) - not 0, which this model rejects outright; see
#      _generate()'s docstring - removing nearly all of the single
#      biggest uncontrolled consumer.
#   2. _BATCH_SYSTEM_PROMPT below now asks for "a few words" instead of
#      "1-2 sentences" per reasoning field.
# What's actually left to budget for, per item: 4 JSON fields + object/
# array punctuation (~30-40 tokens) plus a short reasoning phrase
# (~10-20 tokens even generously) - call it under 100 tokens of genuine
# content per item in the common case. 350 gives roughly 3-4x headroom
# over that estimate: enough to comfortably absorb the model not
# perfectly complying with "a few words" sometimes, without going all
# the way to the single-item path's 800 (which budgeted for a THREE-
# sentence reasoning field AND had to absorb uncontrolled thinking -
# neither applies here anymore).
_BATCH_TOKENS_PER_ITEM = 350

_BATCH_SYSTEM_PROMPT = _COMBINED_SYSTEM_PROMPT + """

You will be given MULTIPLE numbered student/reference pairs in one request. Answer \
both questions for EACH pair independently - do not let one pair's answer influence \
another's. Keep each "reasoning" field to one short phrase (a few words), NOT a full \
sentence - the output budget is shared across every pair in this request, so brevity \
here matters. Respond with ONLY a JSON array (no prose, no markdown fences), with \
exactly one object per pair IN THE SAME ORDER they were given, each shaped like:
{"contradicts_reference": <true|false>, "hallucinated_claim": <true|false>, "logic_valid": <true|false>, "reasoning": "<a few words, not a full sentence>"}
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

        raw_text = None  # pristine, unmodified response text - kept
        # separate from cleaned_text below specifically so the except
        # block can log EXACTLY what Gemini returned (fences, prefixes,
        # truncation and all), not the already-stripped version.
        try:
            # thinking_budget=1: see _generate()'s docstring - this is
            # the working way to minimize thinking (unlike the
            # thinking_level="low" attempt elsewhere, which silently
            # no-ops in this SDK version). NOT 0 - confirmed via a live
            # call that gemini-3.6-flash rejects thinking_budget=0
            # outright (400 INVALID_ARGUMENT; "0 is DISABLED" per the
            # SDK's generic field docstring, but "allowed ranges are
            # model dependent" per that same docstring, and 0 isn't in
            # this model's accepted range) - 1 is the smallest budget
            # this model actually accepts, confirmed the same way.
            # Frees up nearly all of the real budget for the actual JSON
            # content instead of competing with it.
            raw_text = _generate_with_retry(
                _BATCH_SYSTEM_PROMPT, user_prompt, max_output_tokens=max_tokens, thinking_budget=1
            )
            cleaned_text = (raw_text or "").strip().strip("`")
            if cleaned_text.lower().startswith("json"):
                cleaned_text = cleaned_text[4:].strip()
            parsed_array = json.loads(cleaned_text)

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
            # Debug visibility only - purely additive, does not change the
            # graceful-fallback behavior above (those items still skip the
            # override exactly as before). %r (repr) so exact whitespace,
            # quote characters, and any markdown fences are unambiguous in
            # the log rather than silently normalized away.
            logger.warning(
                "llm_judge.py: RAW response text for the failed chunk (%d pairs):\n%r",
                len(chunk_pairs), raw_text,
            )
            for idx in chunk_indices:
                results[idx] = {"available": False, "error": str(e)}

    return [_to_verdict(r) for r in results]


def _to_verdict(result: dict) -> dict:
    """
    Normalizes a raw judge result (single or batch) into the public
    verdict shape returned by judge_answer/judge_batch. Includes
    is_coherent_claim (see _COMBINED_SYSTEM_PROMPT's Question 3) in
    override_to_incorrect alongside the original three - a text that
    isn't a coherent claim at all shouldn't trivially pass just because
    it also doesn't contradict/hallucinate/break logic (there's nothing
    coherent enough to do any of those TO). Note: judge_answer() itself
    is no longer called by evaluate_answer() (see
    llm_judge.judge_answer_polled() and evaluator.py's POLL_* constants
    for why a single verdict is no longer trusted there) - this
    normalizer still backs judge_batch()/evaluate_answers_batch(), which
    gets this coherence check for free via the shared prompt, without
    the polling fix (that's still evaluate_answer()-only - see
    evaluate_answers_batch()'s docstring for that known gap).
    """
    available = result.get("available", False)
    contradicts = bool(result.get("contradicts_reference")) if available else False
    hallucinated = bool(result.get("hallucinated_claim")) if available else False
    logic_invalid = (result.get("logic_valid") is False) if available else False
    incoherent = (result.get("is_coherent_claim") is False) if available else False

    return {
        "judge_available": available,
        "contradicts_reference": contradicts if available else None,
        "hallucinated_claim": hallucinated if available else None,
        "logic_valid": result.get("logic_valid") if available else None,
        "is_coherent_claim": result.get("is_coherent_claim") if available else None,
        "reasoning": result.get("reasoning") if available else result.get("error"),
        "override_to_incorrect": contradicts or hallucinated or logic_invalid or incoherent,
    }