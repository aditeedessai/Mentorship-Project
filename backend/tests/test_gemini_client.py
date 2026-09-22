import json
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from backend.api.deps import AuthenticatedUser
from backend.api.routes import study_sets
from backend.quiz_generation import gemini_client


class ProviderError(Exception):
    def __init__(self, code, retry_after=None):
        self.code = code
        self.response = MagicMock()
        self.response.headers = {}
        if retry_after is not None:
            self.response.headers["Retry-After"] = retry_after
        super().__init__(f"provider error {code}")


def fake_client(responses):
    request_client = MagicMock()
    request_client.models.generate_content.side_effect = responses
    return request_client


def response_for(payload):
    response = MagicMock()
    response.text = json.dumps(payload)
    return response


def summary_payload():
    return {
        "title": "Biology",
        "overview_paragraphs": ["Cells are living systems."],
        "key_topics": ["Cells"],
    }


def flashcard_payload():
    return {
        "flashcards": [
            {"term": "Cell", "definition": "The basic unit of life."}
        ]
    }


def quiz_question(question_type, index):
    question = {
        "question_id": f"q{index}",
        "question_type": question_type,
        "topic": "Cells",
        "question": f"Question {index}?",
        "reference_answer": "A valid answer.",
    }
    if question_type == "mcq":
        question["options"] = {
            "A": "Option A",
            "B": "Option B",
            "C": "Option C",
            "D": "Option D",
        }
        question["correct_option"] = "A"
    return question


def quiz_payload(question_type="short", count=5):
    return {
        "questions": [
            quiz_question(question_type, index)
            for index in range(1, count + 1)
        ]
    }


def call_generate(request_client, feature, question_type=None):
    return gemini_client.generate_json(
        request_client,
        feature=feature,
        prompt="prompt",
        question_type=question_type,
    )


@pytest.mark.parametrize("status_code", [429, 500, 502, 503])
def test_transient_provider_error_retries_and_eventually_succeeds(status_code):
    request_client = fake_client([
        ProviderError(status_code),
        response_for(summary_payload()),
    ])

    with patch.object(gemini_client.time, "sleep") as sleep:
        result = call_generate(request_client, "summary")

    assert result == summary_payload()
    assert request_client.models.generate_content.call_count == 2
    assert sleep.call_count == 1


def test_timeout_and_network_errors_retry():
    request_client = fake_client([
        TimeoutError("timed out"),
        gemini_client.httpx.ConnectError("connection failed"),
        response_for(summary_payload()),
    ])

    with patch.object(gemini_client.time, "sleep") as sleep:
        result = call_generate(request_client, "summary")

    assert result == summary_payload()
    assert request_client.models.generate_content.call_count == 3
    assert sleep.call_count == 2


def test_permanent_provider_error_is_not_retried():
    request_client = fake_client([ProviderError(400)])

    with pytest.raises(gemini_client.GeminiGenerationError) as error:
        call_generate(request_client, "summary")

    assert error.value.status_code == 502
    assert request_client.models.generate_content.call_count == 1


def test_numeric_retry_after_is_honored_with_backoff_cap():
    request_client = fake_client([
        ProviderError(429, "60"),
        response_for(summary_payload()),
    ])

    with patch.object(gemini_client.time, "sleep") as sleep:
        call_generate(request_client, "summary")

    assert sleep.call_args.args[0] <= gemini_client.GEMINI_MAX_BACKOFF_SECONDS + 0.5
    assert sleep.call_args.args[0] >= gemini_client.GEMINI_MAX_BACKOFF_SECONDS


def test_http_date_retry_after_is_honored_with_backoff_cap():
    retry_at = datetime.now(timezone.utc) + timedelta(seconds=60)
    request_client = fake_client([
        ProviderError(503, retry_at.strftime("%a, %d %b %Y %H:%M:%S GMT")),
        response_for(summary_payload()),
    ])

    with patch.object(gemini_client.time, "sleep") as sleep:
        call_generate(request_client, "summary")

    assert sleep.call_args.args[0] <= gemini_client.GEMINI_MAX_BACKOFF_SECONDS + 0.5
    assert sleep.call_args.args[0] >= gemini_client.GEMINI_MAX_BACKOFF_SECONDS


def test_empty_response_is_logged_and_rejected(caplog):
    response = MagicMock()
    response.text = ""

    with caplog.at_level("WARNING", logger=gemini_client.logger.name):
        with pytest.raises(gemini_client.GeminiGenerationError) as error:
            call_generate(fake_client([response]), "summary")

    assert error.value.category == "empty_response"
    assert "summary" in caplog.text
    assert "empty_response" in caplog.text


def test_markdown_fenced_json_is_accepted():
    response = MagicMock()
    response.text = (
        "Here is the result:\n```json\n"
        + json.dumps(summary_payload())
        + "\n```"
    )

    result = call_generate(fake_client([response]), "summary")

    assert result == summary_payload()


def test_malformed_json_is_logged_and_rejected(caplog):
    response = MagicMock()
    response.text = '{"title": "incomplete"'

    with caplog.at_level("WARNING", logger=gemini_client.logger.name):
        with pytest.raises(gemini_client.GeminiGenerationError) as error:
            call_generate(fake_client([response]), "summary")

    assert error.value.category == "malformed_json"
    assert "malformed_json" in caplog.text
    assert "incomplete" not in caplog.text


def test_valid_summary_and_flashcard_payloads():
    assert call_generate(
        fake_client([response_for(summary_payload())]),
        "summary",
    ) == summary_payload()
    assert call_generate(
        fake_client([response_for(flashcard_payload())]),
        "flashcards",
    ) == flashcard_payload()


@pytest.mark.parametrize("question_type", ["mcq", "short", "long", "application"])
def test_valid_quiz_payload_supports_all_question_types(question_type):
    payload = quiz_payload(question_type)

    result = call_generate(
        fake_client([response_for(payload)]),
        "quiz",
        question_type,
    )

    assert len(result["questions"]) == 5
    assert all(q["question_type"] == question_type for q in result["questions"])


@pytest.mark.parametrize("count", [4, 6])
def test_quiz_requires_exactly_five_questions(count):
    payload = quiz_payload("short", count)

    with pytest.raises(gemini_client.GeminiGenerationError, match="exactly 5"):
        call_generate(
            fake_client([response_for(payload)]),
            "quiz",
            "short",
        )


def test_invalid_quiz_structure_is_rejected():
    invalid_payloads = [
        [],
        {"questions": "not a list"},
        {"questions": [
            quiz_question("unsupported", index)
            for index in range(1, 6)
        ]},
    ]

    for payload in invalid_payloads:
        with pytest.raises(gemini_client.GeminiGenerationError):
            call_generate(
                fake_client([response_for(payload)]),
                "quiz",
                "short",
            )


def test_invalid_mcq_options_are_rejected():
    payload = quiz_payload("mcq")
    payload["questions"][0]["options"] = {"A": "Only one option"}

    with pytest.raises(gemini_client.GeminiGenerationError, match="multiple-choice"):
        call_generate(fake_client([response_for(payload)]), "quiz", "mcq")


def test_structured_json_request_configuration_is_used():
    request_client = fake_client([response_for(summary_payload())])

    call_generate(request_client, "summary")

    config = request_client.models.generate_content.call_args.kwargs["config"]
    assert config.response_mime_type == "application/json"
    assert config.response_schema["type"] == "OBJECT"
    assert config.response_schema["properties"]["title"]["type"] == "STRING"

    quiz_schema = gemini_client._response_schema("quiz", "mcq")
    options = quiz_schema["properties"]["questions"]["items"]["properties"]["options"]
    assert set(options["properties"]) == {"A", "B", "C", "D"}


def test_route_maps_gemini_status_and_retry_after():
    study_set_id = uuid4()
    user = AuthenticatedUser(user_id=str(uuid4()))
    error = gemini_client.GeminiGenerationError(
        "safe message",
        status_code=429,
        retry_after="7",
        feature="summary",
        category="provider_rate_limit",
    )

    with patch.object(
        study_sets.study_service,
        "get_study_set",
        return_value={"study_set_id": str(study_set_id)},
    ), patch.object(study_sets, "generate_summary", side_effect=error):
        with pytest.raises(HTTPException) as raised:
            study_sets.generate_study_set_summary(study_set_id, user)

    assert raised.value.status_code == 429
    assert raised.value.headers["Retry-After"] == "7"
    assert raised.value.detail == "safe message"


def test_route_returns_500_when_summary_persistence_fails():
    study_set_id = uuid4()
    user = AuthenticatedUser(user_id=str(uuid4()))

    with patch.object(
        study_sets.study_service,
        "get_study_set",
        return_value={"study_set_id": str(study_set_id)},
    ), patch.object(
        study_sets,
        "generate_summary",
        return_value=summary_payload(),
    ), patch.object(
        study_sets.summary_repository,
        "save_summary",
        side_effect=RuntimeError("database unavailable"),
    ):
        with pytest.raises(HTTPException) as raised:
            study_sets.generate_study_set_summary(study_set_id, user)

    assert raised.value.status_code == 500
    assert "Please try again later" in raised.value.detail
