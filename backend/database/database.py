import os
import threading
import time
import psycopg2
import psycopg2.extras
import psycopg2.pool
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

# Pool sizing: minconn are opened eagerly and kept warm; the pool grows
# up to maxconn on demand as concurrent callers exceed what's idle, and
# any call beyond maxconn raises psycopg2.pool.PoolError instead of
# opening an unbounded number of connections against Supabase's pooler.
DB_POOL_MIN_CONN = int(os.environ.get("DB_POOL_MIN_CONN", "2"))
DB_POOL_MAX_CONN = int(os.environ.get("DB_POOL_MAX_CONN", "20"))

# How long get_connection() is willing to wait for a connection to free up
# once the pool is at DB_POOL_MAX_CONN, and how often it re-checks while
# waiting. ThreadedConnectionPool.getconn() itself never blocks - it raises
# psycopg2.pool.PoolError immediately when nothing is available - so the
# retry loop in get_connection() is what turns a burst of concurrent
# requests into a brief queue instead of an instant 500 for whichever
# requests land past the maxconn'th.
DB_POOL_ACQUIRE_TIMEOUT_SECONDS = float(os.environ.get("DB_POOL_ACQUIRE_TIMEOUT_SECONDS", "5"))
DB_POOL_ACQUIRE_RETRY_INTERVAL_SECONDS = float(
    os.environ.get("DB_POOL_ACQUIRE_RETRY_INTERVAL_SECONDS", "0.1")
)


class _VectorAwareConnectionPool(psycopg2.pool.ThreadedConnectionPool):
    """
    ThreadedConnectionPool that registers pgvector's adapter on every
    *physical* connection exactly once, at the moment psycopg2 actually
    opens it - not on every checkout.

    _connect() is only called by the base pool when it needs to create a
    brand-new connection (minconn times at pool creation, and again each
    time the pool has to grow up to maxconn); a connection handed back
    out by getconn() after being reused never passes through _connect()
    again, so this can neither run twice on the same physical connection
    nor be skipped on one that's being reused.
    """

    def _connect(self, key=None):
        conn = super()._connect(key)
        register_vector(conn)
        return conn


_pool: "_VectorAwareConnectionPool | None" = None
_pool_lock = threading.Lock()


def init_pool() -> _VectorAwareConnectionPool:
    """
    Creates the process-wide connection pool on first call and returns it
    (or just returns the existing one on every call after that).

    Called explicitly from api/main.py's lifespan at startup, so a bad
    DATABASE_URL / unreachable database fails fast before the app starts
    accepting traffic - matching how init_db()'s reachability check
    already behaves today. Also safe to call implicitly via
    get_connection() below, so test files and standalone scripts under
    backend/scratch/ that import this module directly - without ever
    going through FastAPI's lifespan - keep working unchanged.
    """
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _pool = _VectorAwareConnectionPool(
                    DB_POOL_MIN_CONN,
                    DB_POOL_MAX_CONN,
                    dsn=DATABASE_URL,
                    cursor_factory=psycopg2.extras.RealDictCursor,
                    # Supabase's session pooler silently drops connections that
                    # sit idle too long; TCP keepalives make the OS notice a
                    # dead socket sooner instead of leaving a connection that
                    # *looks* open in the pool indefinitely.
                    keepalives=1,
                    keepalives_idle=30,
                    keepalives_interval=10,
                    keepalives_count=3,
                )
    return _pool


def close_pool() -> None:
    """
    Closes every pooled connection and clears the pool so a later
    get_connection() call creates a fresh one. Called from api/main.py's
    lifespan on shutdown; harmless to call when no pool has been created
    yet (e.g. a process that never touched the database).
    """
    global _pool
    with _pool_lock:
        if _pool is not None:
            _pool.closeall()
            _pool = None


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

    def __init__(self, conn, conn_pool: _VectorAwareConnectionPool):
        self._conn = conn
        self._pool = conn_pool

    def execute(self, query, params=None):
        query = query.replace("?", "%s")
        cursor = self._conn.cursor()
        cursor.execute(query, params or ())
        return cursor

    def commit(self):
        self._conn.commit()

    def close(self):
        """
        Releases the connection back to the pool instead of terminating
        it. Repository code doesn't always call commit() explicitly (many
        functions are read-only), and if an exception was raised mid
        query the connection is left in Postgres's "aborted transaction"
        state - either way, rolling back here (a no-op if there's nothing
        open to roll back, e.g. after a normal commit()) guarantees
        whoever borrows this connection next starts from a clean state.

        If the rollback itself fails, the underlying connection is
        assumed broken and is discarded (close=True) rather than pooled,
        so a bad connection can't be handed to the next caller - the pool
        will transparently open a fresh one in its place next time it's
        needed, up to DB_POOL_MAX_CONN.
        """
        discard = self._conn.closed
        if not discard:
            try:
                self._conn.rollback()
            except Exception:
                discard = True
        self._pool.putconn(self._conn, close=discard)

    def cursor(self):
        return self._conn.cursor()


def _is_connection_alive(conn) -> bool:
    """
    Pings a pooled connection with a cheap query before it's handed to a
    caller. Supabase's session pooler closes connections that sit idle
    past its own timeout without telling psycopg2 - the pool still thinks
    they're open, and the first real query on one raises
    "server closed the connection unexpectedly" deep inside repository
    code. Catching that here, on a throwaway SELECT 1, means the caller
    never sees it.
    """
    if conn.closed:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
    except psycopg2.OperationalError:
        conn.rollback()
        return False
    return True


def get_connection():
    """
    Returns a pooled Postgres connection (via Supabase) wrapped so
    existing repository code keeps working unchanged - same function
    name, same call signature, same ConnectionWrapper interface. Rows
    come back dict-like (RealDictCursor), matching the old sqlite3.Row +
    dict(row) pattern used throughout the repository files.

    pgvector adaptation (letting psycopg2 adapt plain Python lists /
    numpy arrays directly into Postgres's `vector` type) is registered
    once per physical connection by _VectorAwareConnectionPool, not here
    - see init_pool().

    If every pooled connection is currently checked out, this retries
    briefly (polling every DB_POOL_ACQUIRE_RETRY_INTERVAL_SECONDS) instead
    of letting psycopg2.pool.PoolError propagate immediately, so a short
    burst of concurrent requests queues for a free connection rather than
    failing outright. Routes run as plain `def` handlers in FastAPI's
    threadpool, so blocking this worker thread with time.sleep() here
    only holds up the one request waiting for a connection - it doesn't
    block the event loop or any other request. If nothing frees up within
    DB_POOL_ACQUIRE_TIMEOUT_SECONDS, the PoolError is raised for real -
    at that point the pool is genuinely saturated for longer than a
    normal query should ever take, and that's a signal worth surfacing
    (as a 500) rather than masking with an even longer wait.
    """
    conn_pool = init_pool()
    deadline = time.monotonic() + DB_POOL_ACQUIRE_TIMEOUT_SECONDS
    while True:
        try:
            conn = conn_pool.getconn()
        except (psycopg2.pool.PoolError, psycopg2.OperationalError):
            # PoolError: our own pool's bookkeeping says every connection
            # up to DB_POOL_MAX_CONN is already checked out.
            # OperationalError: our pool still had room to open a new
            # physical connection, but Supabase's own session pooler
            # rejected it (e.g. "max clients reached in session mode") -
            # a hard ceiling enforced upstream of anything DB_POOL_MAX_CONN
            # controls. Retrying gives an in-flight connection a chance to
            # free up on Supabase's side too, not just ours.
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise
            time.sleep(min(DB_POOL_ACQUIRE_RETRY_INTERVAL_SECONDS, remaining))
            continue

        if _is_connection_alive(conn):
            return ConnectionWrapper(conn, conn_pool)

        # Dead connection the pooler dropped server-side - discard it
        # (the pool opens a fresh one in its place, up to DB_POOL_MAX_CONN)
        # and loop back around to get another.
        conn_pool.putconn(conn, close=True)
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise psycopg2.OperationalError(
                "Timed out replacing dead pooled connections"
            )


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