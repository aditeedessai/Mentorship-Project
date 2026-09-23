import os
import subprocess
import psycopg2
import pytest
from pathlib import Path
from dotenv import load_dotenv

TESTS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = TESTS_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env")


def get_db_connection():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        pytest.skip("DATABASE_URL not configured")
    return psycopg2.connect(database_url)


def test_database_constraint_preservation():
    """
    TC153 Requirement:
    - Keep the database unique email constraint.
    - Do not remove or weaken the database constraint.
    
    Verifies that the partial unique index `users_email_partial_key` exists on `auth.users`
    and enforces email uniqueness for non-SSO users.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = 'auth' 
              AND tablename = 'users' 
              AND indexname = 'users_email_partial_key';
        """)
        row = cur.fetchone()
        assert row is not None, "Unique index users_email_partial_key must exist on auth.users"
        index_name, index_def = row
        assert index_name == "users_email_partial_key"
        assert "CREATE UNIQUE INDEX users_email_partial_key ON auth.users" in index_def
        assert "(is_sso_user = false)" in index_def
    finally:
        cur.close()
        conn.close()


def test_actual_signup_concurrency_flow():
    """
    TC153 Requirement:
    - Tests the actual signup request path (supabase.auth.signUp).
    - Concurrent same-email requests must create only one user.
    - The losing request must not return HTTP 500.
    - Catch/handle only the duplicate-email unique-constraint violation.
    - Return HTTP 409 Conflict.
    - Return a safe message: 'An account with this email already exists.'
    - Do not expose PostgreSQL constraint names, SQL errors, stack traces, or internal DB details.
    - Keep unexpected database/server errors as HTTP 500.
    """
    frontend_dir = PROJECT_ROOT / "frontend-new"
    test_script = frontend_dir / "tests" / "test_signup_concurrency.mjs"

    assert test_script.exists(), f"Concurrency test script {test_script} must exist"

    # Run the Node-based concurrency test for the actual supabase.auth.signUp() path
    result = subprocess.run(
        ["node", "tests/test_signup_concurrency.mjs"],
        cwd=str(frontend_dir),
        capture_output=True,
        text=True,
        timeout=60,
    )

    print("STDOUT:\n", result.stdout)
    if result.stderr:
        print("STDERR:\n", result.stderr)

    assert result.returncode == 0, f"Concurrency test failed with return code {result.returncode}"
    assert "ALL 4 TC153 TESTS PASSED SUCCESSFULLY" in result.stdout
    assert "New Email -> Successful Signup -> OTP Flow" in result.stdout
    assert "User has non-empty identities array" in result.stdout
    assert "Existing Email -> Controlled Duplicate-Email Handling" in result.stdout
    assert "res.data.user is null -> does not navigate to OTP verification" in result.stdout
    assert "Concurrent Same-Email Signup" in result.stdout
    assert "Exactly one signup succeeded" in result.stdout
    assert "Exactly one signup failed as conflict" in result.stdout
    assert "Losing request received HTTP 409 Conflict" in result.stdout
    assert "Losing request did NOT receive HTTP 500" in result.stdout
    assert "An account with this email already exists." in result.stdout
    assert "Unrelated endpoint 500 error remains HTTP 500" in result.stdout
    assert "Unrelated signup 500 error (e.g. SMTP timeout) remains HTTP 500" in result.stdout

    # Clean up any test users created by the test
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM auth.users WHERE email LIKE %s OR email LIKE %s;", ("tc153_new_%", "tc153_concurr_%"))
        conn.commit()
    finally:
        cur.close()
        conn.close()

