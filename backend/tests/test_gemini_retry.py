"""
Unit tests for backend.quiz_generation.gemini_retry - the shared
"call Gemini, parse JSON, retry transient failures" helper.

No network, no DB, no API key needed: the Gemini client is a stub and
time.sleep is patched out.
"""

import json
from unittest.mock import patch

import pytest

from backend.quiz_generation import gemini_retry as gr


class FakeAPIError(Exception):
    """Mimics google.genai.errors.APIError: has .code and formats as '<code> <STATUS>. <msg>'."""

    def __init__(self, code, status, message=""):
        self.code = code
        super().__init__(f"{code} {status}. {message}")


class Resp:
    def __init__(self, text):
        self.text = text


class StubClient:
    """client.models.generate_content(...) that plays back a scripted list."""

    def __init__(self, script):
        self.script = list(script)
        self.calls = 0
        self.models = self

    def generate_content(self, model, contents):
        self.calls += 1
        item = self.script.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


GOOD = Resp(json.dumps({"questions": [{"question": "Q?"}]}))


@pytest.fixture(autouse=True)
def no_sleep():
    with patch.object(gr.time, "sleep") as s:
        yield s


def run(client, **kw):
    return gr.generate_json_with_retry(client, "m", "prompt", label="t", **kw)


def test_success_first_try_makes_one_call():
    c = StubClient([GOOD])
    assert run(c, required_key="questions")["questions"][0]["question"] == "Q?"
    assert c.calls == 1


def test_503_overloaded_is_retried_then_succeeds(no_sleep):
    c = StubClient([FakeAPIError(503, "UNAVAILABLE", "model is overloaded"), GOOD])
    assert "questions" in run(c, required_key="questions")
    assert c.calls == 2
    assert no_sleep.called


def test_504_deadline_exceeded_is_retried():
    c = StubClient([FakeAPIError(504, "DEADLINE_EXCEEDED"), GOOD])
    run(c)
    assert c.calls == 2


def test_per_minute_429_with_short_hint_is_retried(no_sleep):
    err = FakeAPIError(429, "RESOURCE_EXHAUSTED", "Please retry in 4.2s.")
    c = StubClient([err, GOOD])
    run(c)
    assert c.calls == 2
    assert no_sleep.call_args[0][0] == pytest.approx(4.7)


def test_daily_quota_429_is_NOT_retried():
    err = FakeAPIError(
        429, "RESOURCE_EXHAUSTED",
        "Quota exceeded for metric ...GenerateRequestsPerDayPerProjectPerModel-FreeTier",
    )
    c = StubClient([err, GOOD])
    with pytest.raises(FakeAPIError):
        run(c)
    assert c.calls == 1


def test_429_with_long_retry_hint_is_NOT_retried():
    err = FakeAPIError(429, "RESOURCE_EXHAUSTED", "Please retry in 43.9s.")
    c = StubClient([err, GOOD])
    with pytest.raises(FakeAPIError):
        run(c)
    assert c.calls == 1


@pytest.mark.parametrize("code,status", [(400, "INVALID_ARGUMENT"), (401, "UNAUTHENTICATED"),
                                          (403, "PERMISSION_DENIED"), (404, "NOT_FOUND")])
def test_client_errors_fail_fast(code, status):
    c = StubClient([FakeAPIError(code, status), GOOD])
    with pytest.raises(FakeAPIError):
        run(c)
    assert c.calls == 1


def test_gives_up_after_max_attempts():
    c = StubClient([FakeAPIError(503, "UNAVAILABLE")] * gr.MAX_ATTEMPTS)
    with pytest.raises(FakeAPIError):
        run(c)
    assert c.calls == gr.MAX_ATTEMPTS


def test_empty_reply_is_retried():
    c = StubClient([Resp(None), Resp("   "), GOOD])
    run(c, required_key="questions")
    assert c.calls == 3


def test_unparseable_reply_is_retried():
    c = StubClient([Resp("Sorry, I can't do that."), GOOD])
    run(c, required_key="questions")
    assert c.calls == 2


def test_json_code_fence_is_stripped():
    c = StubClient([Resp("```json\n" + GOOD.text + "\n```")])
    assert "questions" in run(c, required_key="questions")


def test_json_wrapped_in_prose_is_recovered():
    c = StubClient([Resp("Here is your quiz:\n" + GOOD.text + "\nHope that helps!")])
    assert "questions" in run(c, required_key="questions")


def test_bare_list_is_wrapped_under_required_key():
    c = StubClient([Resp(json.dumps([{"question": "Q?"}]))])
    assert run(c, required_key="questions") == {"questions": [{"question": "Q?"}]}


def test_missing_required_key_is_retried():
    c = StubClient([Resp(json.dumps({"oops": 1})), GOOD])
    run(c, required_key="questions")
    assert c.calls == 2


def test_network_timeout_without_status_is_retried():
    c = StubClient([TimeoutError("read timed out"), GOOD])
    run(c)
    assert c.calls == 2


def _recording_client(script):
    seen = []

    class C(StubClient):
        def generate_content(self, model, contents):
            seen.append(model)
            return super().generate_content(model, contents)

    return C(script), seen


def test_fallback_model_used_after_503(monkeypatch):
    monkeypatch.setattr(gr, "FALLBACK_MODEL", "backup-model")
    c, seen = _recording_client([FakeAPIError(503, "UNAVAILABLE", "high demand"), GOOD])
    run(c)
    assert seen == ["m", "backup-model"]


def test_fallback_not_used_for_non_overload_errors(monkeypatch):
    monkeypatch.setattr(gr, "FALLBACK_MODEL", "backup-model")
    c, seen = _recording_client([Resp("not json"), GOOD])
    run(c)
    assert seen == ["m", "m"]


def test_no_fallback_configured_keeps_same_model(monkeypatch):
    monkeypatch.setattr(gr, "FALLBACK_MODEL", None)
    c, seen = _recording_client([FakeAPIError(503, "UNAVAILABLE"), GOOD])
    run(c)
    assert seen == ["m", "m"]
