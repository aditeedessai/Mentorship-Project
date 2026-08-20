import os
import psycopg2
import psycopg2.extras
from pathlib import Path
from dotenv import load_dotenv
from pgvector.psycopg2 import register_vector

# Loads DATABASE_URL from backend/.env, resolved relative to this file
# (not wherever the process happens to be launched from).
BACKEND_DIR = Path(__file__).resolve().parents[1]  # backend/database/database.py -> backend/
load_dotenv(BACKEND_DIR / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL not found. Add it to backend/.env "
        "(Supabase -> Connect -> Session pooler connection string)."
    )


class ConnectionWrapper:
    """
    Makes a psycopg2 connection behave like the sqlite3.Connection object
    every repository file was written against - specifically, letting
    connection.execute(query, params) work directly, since psycopg2 only
    exposes .execute() on cursor objects, not the connection itself.

    Also rewrites SQLite's '?' placeholders to Postgres's '%s' on the fly,
    so attempt_repository.py / evaluation_repository.py / quiz_repository.py /
    study_set_repository.py need zero changes to their query strings.
    """

    def __init__(self, conn):
        self._conn = conn

    def execute(self, query, params=None):
        query = query.replace("?", "%s")
        cursor = self._conn.cursor()
        cursor.execute(query, params or ())
        return cursor

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()

    def cursor(self):
        return self._conn.cursor()


def get_connection():
    """
    Returns a Postgres connection (via Supabase) wrapped so existing
    repository code keeps working unchanged. Rows come back dict-like
    (RealDictCursor), matching the old sqlite3.Row + dict(row) pattern
    used throughout the repository files.

    register_vector(conn) lets psycopg2 adapt plain Python lists /
    numpy arrays directly into Postgres's `vector` type - without this,
    inserting an embedding into document_chunks.embedding would need a
    manual string-format + ::vector cast on every call site instead.
    """
    conn = psycopg2.connect(
        DATABASE_URL,
        cursor_factory=psycopg2.extras.RealDictCursor,
    )
    register_vector(conn)
    return ConnectionWrapper(conn)


def init_db():
    """
    No-op now that schema lives in supabase/migrations/ and is applied via
    `supabase db push`, not created here at runtime. Kept as a callable
    (rather than deleted) because test_scoring_integration.py still calls
    it in a pytest fixture - this just verifies the DB is reachable
    instead of running SQLite-style DDL against Postgres, which would
    either error or silently do nothing now that the tables already exist.
    """
    connection = get_connection()
    try:
        connection.execute("select 1;").fetchone()
    finally:
        connection.close()