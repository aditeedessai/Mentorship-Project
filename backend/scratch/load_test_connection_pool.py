"""
Fires WORKERS concurrent get_connection() calls against the connection
pool (DB_POOL_MAX_CONN=20 by default) to verify that a burst larger than
the pool absorbs by queuing (via get_connection()'s retry loop) instead
of raising, and that every checked-out connection is reliably returned -
no leaks left sitting in the pool's "used" set once every worker finishes.

Run from the repo root:
    python -m backend.scratch.load_test_connection_pool
"""

import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from backend.database.database import close_pool, get_connection, init_pool

WORKERS = 28  # comfortably above DB_POOL_MAX_CONN=20 to force queuing
HOLD_SECONDS = 0.3  # simulated query/handling time per worker, so enough
# workers overlap at once to actually exhaust the pool rather than each
# finishing before the next one starts


def worker(worker_id: int) -> tuple[int, bool, str]:
    start = time.monotonic()
    try:
        conn = get_connection()
        conn.execute("select pg_sleep(%s)", (HOLD_SECONDS,))
        conn.close()
        return worker_id, True, f"OK in {time.monotonic() - start:.2f}s"
    except Exception as e:
        return worker_id, False, f"{type(e).__name__}: {e} (after {time.monotonic() - start:.2f}s)"


def main() -> None:
    pool = init_pool()
    print(f"Pool ready: minconn={pool.minconn}, maxconn={pool.maxconn}")
    print(f"Firing {WORKERS} concurrent workers (each holding a connection "
          f"for {HOLD_SECONDS}s) against the maxconn={pool.maxconn} pool...\n")

    start = time.monotonic()
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = [executor.submit(worker, i) for i in range(WORKERS)]
        results = [f.result() for f in as_completed(futures)]
    total_elapsed = time.monotonic() - start

    results.sort(key=lambda r: r[0])
    for worker_id, ok, msg in results:
        print(f"worker {worker_id:2d}: {'OK  ' if ok else 'FAIL'} {msg}")

    failures = [r for r in results if not r[1]]
    used_after = len(pool._used)  # psycopg2 pool internals - fine for a diagnostic script

    print(f"\n{len(results) - len(failures)}/{len(results)} workers succeeded "
          f"in {total_elapsed:.2f}s total.")
    print(f"Connections still checked out after run: {used_after} (should be 0)")

    close_pool()

    assert used_after == 0, "LEAK: some connections were never returned to the pool"
    assert not failures, f"{len(failures)} worker(s) failed - burst was not absorbed cleanly"
    print("\nALL CHECKS PASSED: burst larger than the pool was queued and drained with no leaks or errors.")


if __name__ == "__main__":
    main()
