import uuid
from unittest.mock import patch
import pytest
from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient

from backend.api.deps import AuthenticatedUser, get_current_user
from backend.api.rate_limiter import limiter, rate_limit_by_user


@pytest.fixture(autouse=True)
def auto_reset_limiter():
    """Resets rate limiter state before every test case."""
    limiter.reset()
    yield
    limiter.reset()


def test_1_under_limit_allowed():
    limiter.check_rate_limit("test:user1", max_requests=3, window_seconds=60)
    limiter.check_rate_limit("test:user1", max_requests=3, window_seconds=60)
    limiter.check_rate_limit("test:user1", max_requests=3, window_seconds=60)


def test_2_and_3_exceeding_limit_returns_429_and_retry_after():
    limiter.check_rate_limit("test:user1", max_requests=2, window_seconds=60)
    limiter.check_rate_limit("test:user1", max_requests=2, window_seconds=60)

    with pytest.raises(HTTPException) as exc_info:
        limiter.check_rate_limit("test:user1", max_requests=2, window_seconds=60)

    err = exc_info.value
    assert err.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "Rate limit exceeded" in err.detail
    assert "Retry-After" in err.headers
    assert int(err.headers["Retry-After"]) > 0


def test_4_expired_requests_leave_sliding_window():
    with patch("time.time") as mock_time:
        mock_time.return_value = 1000.0
        limiter.check_rate_limit("test:user1", max_requests=2, window_seconds=10)
        limiter.check_rate_limit("test:user1", max_requests=2, window_seconds=10)

        # 3rd request at t=1000 should fail
        with pytest.raises(HTTPException):
            limiter.check_rate_limit("test:user1", max_requests=2, window_seconds=10)

        # Advance time past 10s window (t=1011)
        mock_time.return_value = 1011.0
        # Should now succeed as past timestamps expired
        limiter.check_rate_limit("test:user1", max_requests=2, window_seconds=10)


def test_5_different_ips_have_independent_limits():
    limiter.check_rate_limit("ip:login:1.1.1.1", max_requests=1, window_seconds=60)

    # 1.1.1.1 is now limited
    with pytest.raises(HTTPException):
        limiter.check_rate_limit("ip:login:1.1.1.1", max_requests=1, window_seconds=60)

    # 2.2.2.2 should still succeed
    limiter.check_rate_limit("ip:login:2.2.2.2", max_requests=1, window_seconds=60)


def test_6_different_users_have_independent_limits():
    limiter.check_rate_limit("user:question_generation:userA", max_requests=1, window_seconds=60)

    # userA is now limited
    with pytest.raises(HTTPException):
        limiter.check_rate_limit("user:question_generation:userA", max_requests=1, window_seconds=60)

    # userB should still succeed
    limiter.check_rate_limit("user:question_generation:userB", max_requests=1, window_seconds=60)


def test_7_ip_and_user_limits_do_not_share_state():
    limiter.check_rate_limit("ip:scope:127.0.0.1", max_requests=1, window_seconds=60)
    # User key with same name string format is distinct
    limiter.check_rate_limit("user:scope:127.0.0.1", max_requests=1, window_seconds=60)


def test_8_rate_limit_scopes_are_isolated():
    limiter.check_rate_limit("scopeA:user1", max_requests=1, window_seconds=60)

    with pytest.raises(HTTPException):
        limiter.check_rate_limit("scopeA:user1", max_requests=1, window_seconds=60)

    # scopeB for same user is unaffected
    limiter.check_rate_limit("scopeB:user1", max_requests=1, window_seconds=60)


def test_9_specific_endpoint_limits_do_not_consume_general_limit():
    limiter.check_rate_limit("question_generation:user1", max_requests=5, window_seconds=600)
    assert len(limiter._requests.get("general_authenticated:user1", [])) == 0


def test_10_reset_clears_state():
    limiter.check_rate_limit("test:key", max_requests=1, window_seconds=60)
    with pytest.raises(HTTPException):
        limiter.check_rate_limit("test:key", max_requests=1, window_seconds=60)

    limiter.reset()

    # After reset, can make request again
    limiter.check_rate_limit("test:key", max_requests=1, window_seconds=60)


def test_11_and_12_authenticated_rate_limiting_uses_verified_jwt_user_id():
    from backend.api.main import app

    valid_user_id = str(uuid.uuid4())

    def mock_user():
        return AuthenticatedUser(user_id=valid_user_id, email="user@example.com")

    app.dependency_overrides[get_current_user] = mock_user
    client = TestClient(app)

    with patch("backend.database.task_repository.get_tasks", return_value=[]):
        res1 = client.get("/api/tasks?body_user_id=fake-user-456", headers={"Authorization": "Bearer fake"})
        assert res1.status_code == 200

        # Key in rate limiter must use JWT-derived user_id
        assert f"calendar_reads:{valid_user_id}" in limiter._requests
        assert "calendar_reads:fake-user-456" not in limiter._requests

    app.dependency_overrides.clear()


def test_13_document_upload_uses_one_combined_limit():
    from backend.api.main import app

    valid_user_id = str(uuid.uuid4())

    def mock_user():
        return AuthenticatedUser(user_id=valid_user_id, email="doc@example.com")

    app.dependency_overrides[get_current_user] = mock_user
    client = TestClient(app)

    valid_doc_id = str(uuid.uuid4())
    valid_set_id = str(uuid.uuid4())

    mock_doc_record = {
        "document_id": valid_doc_id,
        "study_set_id": valid_set_id,
        "file_name": "test.pdf",
        "file_path": "/tmp/test.pdf",
        "created_at": "2026-09-10T12:00:00Z"
    }

    with patch("backend.database.study_set_repository.get_study_set", return_value={"study_set_id": valid_set_id}), \
         patch("backend.services.document_service.process_pdf", return_value=valid_doc_id), \
         patch("backend.database.study_set_repository.get_document_by_id", return_value=mock_doc_record):

        # Limit for document upload is 5 per 10 mins
        for i in range(5):
            res = client.post(
                f"/api/study-sets/{valid_set_id}/documents",
                files={"files": ("test.pdf", b"dummy content", "application/pdf")},
                headers={"Authorization": "Bearer fake"}
            )
            assert res.status_code == 201, f"Request {i+1} failed: {res.text}"

        # 6th request should hit HTTP 429
        res_6 = client.post(
            f"/api/study-sets/{valid_set_id}/documents",
            files={"files": ("test.pdf", b"dummy content", "application/pdf")},
            headers={"Authorization": "Bearer fake"}
        )
        assert res_6.status_code == 429
        assert res_6.json()["detail"] == "Rate limit exceeded. Please try again later."
        assert "Retry-After" in res_6.headers

    app.dependency_overrides.clear()


def test_14_question_generation_rate_limit():
    from backend.api.main import app

    valid_user_id = str(uuid.uuid4())

    def mock_user():
        return AuthenticatedUser(user_id=valid_user_id, email="qgen@example.com")

    app.dependency_overrides[get_current_user] = mock_user
    client = TestClient(app)

    valid_set_id = str(uuid.uuid4())

    with patch("backend.database.study_set_repository.get_study_set", return_value={"study_set_id": valid_set_id}), \
         patch("backend.services.quiz_service.run_quiz", return_value=[]):

        # Limit is 5 requests / 10 mins
        for _ in range(5):
            res = client.post(
                f"/api/study-sets/{valid_set_id}/questions/generate",
                json={"question_type": "mcq"},
                headers={"Authorization": "Bearer fake"}
            )
            assert res.status_code == 201

        # 6th fails
        res6 = client.post(
            f"/api/study-sets/{valid_set_id}/questions/generate",
            json={"question_type": "mcq"},
            headers={"Authorization": "Bearer fake"}
        )
        assert res6.status_code == 429

    app.dependency_overrides.clear()


def test_15_answer_evaluation_rate_limit():
    from backend.api.main import app

    valid_user_id = str(uuid.uuid4())
    valid_question_id = str(uuid.uuid4())
    valid_attempt_id = str(uuid.uuid4())

    def mock_user():
        return AuthenticatedUser(user_id=valid_user_id, email="ans@example.com")

    app.dependency_overrides[get_current_user] = mock_user
    client = TestClient(app)

    mock_attempt = {
        "attempt_id": valid_attempt_id,
        "user_id": valid_user_id,
        "study_set_id": str(uuid.uuid4()),
        "question_type": "mcq",
        "status": "in_progress"
    }

    with patch("backend.database.attempt_repository.get_attempt", return_value=mock_attempt), \
         patch("backend.api.routes.attempts.get_attempt_from_db", return_value=mock_attempt), \
         patch("backend.api.routes.attempts.evaluate_and_save_attempt_answers", return_value={"attempt_id": valid_attempt_id, "evaluations": []}):

        # Limit is 20 requests / 10 mins
        for _ in range(20):
            res = client.post(
                f"/api/attempts/{valid_attempt_id}/answers",
                json={"question_type": "mcq", "answers": [{"question_id": valid_question_id, "student_answer": "A"}]},
                headers={"Authorization": "Bearer fake"}
            )
            assert res.status_code == 200, f"Failed: {res.text}"

        # 21st fails
        res21 = client.post(
            f"/api/attempts/{valid_attempt_id}/answers",
            json={"question_type": "mcq", "answers": [{"question_id": valid_question_id, "student_answer": "A"}]},
            headers={"Authorization": "Bearer fake"}
        )
        assert res21.status_code == 429

    app.dependency_overrides.clear()


def test_16_ai_features_rate_limit():
    from backend.api.main import app

    valid_user_id = str(uuid.uuid4())

    def mock_user():
        return AuthenticatedUser(user_id=valid_user_id, email="ai@example.com")

    app.dependency_overrides[get_current_user] = mock_user
    client = TestClient(app)

    valid_set_id = str(uuid.uuid4())

    mock_summary = {
        "summary_id": str(uuid.uuid4()),
        "study_set_id": valid_set_id,
        "title": "Test Summary",
        "overview_paragraphs": ["Para 1"],
        "key_topics": ["Topic 1", "Topic 2"]
    }

    with patch("backend.services.study_service.get_study_set", return_value={"study_set_id": valid_set_id}), \
         patch("backend.api.routes.study_sets.generate_summary", return_value=mock_summary), \
         patch("backend.database.summary_repository.save_summary"):

        # Limit is 10 requests / 10 mins
        for _ in range(10):
            res = client.post(
                f"/api/study-sets/{valid_set_id}/summary",
                headers={"Authorization": "Bearer fake"}
            )
            assert res.status_code == 200, f"Failed: {res.text}"

        # 11th fails
        res11 = client.post(
            f"/api/study-sets/{valid_set_id}/summary",
            headers={"Authorization": "Bearer fake"}
        )
        assert res11.status_code == 429

    app.dependency_overrides.clear()


def test_17_calendar_reads_rate_limit():
    from backend.api.main import app

    valid_user_id = str(uuid.uuid4())

    def mock_user():
        return AuthenticatedUser(user_id=valid_user_id, email="calread@example.com")

    app.dependency_overrides[get_current_user] = mock_user
    client = TestClient(app)

    with patch("backend.database.task_repository.get_tasks", return_value=[]):
        # 300 requests allowed in 1 minute window
        for _ in range(300):
            res = client.get("/api/tasks", headers={"Authorization": "Bearer fake"})
            assert res.status_code == 200

        # 301st fails
        res301 = client.get("/api/tasks", headers={"Authorization": "Bearer fake"})
        assert res301.status_code == 429

    app.dependency_overrides.clear()


def test_18_calendar_writes_rate_limit():
    from backend.api.main import app

    valid_user_id = str(uuid.uuid4())
    valid_task_id = str(uuid.uuid4())

    def mock_user():
        return AuthenticatedUser(user_id=valid_user_id, email="calwrite@example.com")

    app.dependency_overrides[get_current_user] = mock_user
    client = TestClient(app)

    mock_task_data = {
        "id": valid_task_id,
        "name": "Task 1",
        "user_id": valid_user_id,
        "completed": False,
        "priority": "medium",
        "due_date": "2026-09-10",
        "task_type": "study",
        "created_at": "2026-09-10T12:00:00Z",
        "updated_at": "2026-09-10T12:00:00Z"
    }

    with patch("backend.database.task_repository.create_task", return_value=mock_task_data), \
         patch("backend.services.google_calendar_service.sync_task_to_calendar"):

        # 60 requests allowed in 10 mins
        for _ in range(60):
            res = client.post("/api/tasks", json={"name": "Task 1"}, headers={"Authorization": "Bearer fake"})
            assert res.status_code == 201, f"Failed: {res.text}"

        # 61st fails
        res61 = client.post("/api/tasks", json={"name": "Task 1"}, headers={"Authorization": "Bearer fake"})
        assert res61.status_code == 429

    app.dependency_overrides.clear()


def test_19_unauthenticated_auth_ip_rate_limits():
    from backend.api.main import app
    client = TestClient(app)

    # Login limit: 10 req / 5 min / IP
    for _ in range(10):
        res = client.post("/api/auth/login", json={"email": "a@b.com", "password": "pass"})
        assert res.status_code == 200

    res_login_11 = client.post("/api/auth/login", json={"email": "a@b.com", "password": "pass"})
    assert res_login_11.status_code == 429

    limiter.reset()

    # Signup limit: 5 req / 15 min / IP
    for _ in range(5):
        res = client.post("/api/auth/signup", json={"email": "a@b.com", "password": "pass"})
        assert res.status_code == 201

    res_signup_6 = client.post("/api/auth/signup", json={"email": "a@b.com", "password": "pass"})
    assert res_signup_6.status_code == 429

    limiter.reset()

    # Password reset limit: 5 req / 15 min / IP
    for _ in range(5):
        res = client.post("/api/auth/password-reset", json={"email": "a@b.com"})
        assert res.status_code == 200

    res_reset_6 = client.post("/api/auth/password-reset", json={"email": "a@b.com"})
    assert res_reset_6.status_code == 429


def test_20_google_oauth_callback_ip_rate_limit():
    from backend.api.main import app
    client = TestClient(app)

    with patch("backend.services.google_calendar_service.FRONTEND_URL", "http://localhost:5173"), \
         patch("backend.services.google_calendar_service.exchange_code", return_value=("user-123", None)):

        # Limit is 10 req / 5 min / IP
        for _ in range(10):
            res = client.get("/api/google-calendar/callback?code=abc&state=xyz", follow_redirects=False)
            assert res.status_code in (302, 307)

        # 11th request fails with 429
        res11 = client.get("/api/google-calendar/callback?code=abc&state=xyz", follow_redirects=False)
        assert res11.status_code == 429
