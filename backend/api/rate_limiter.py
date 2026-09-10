import math
import time
from collections import defaultdict
from threading import Lock
from typing import Callable

from fastapi import Depends, HTTPException, Request, status
from backend.api.deps import AuthenticatedUser, get_current_user


class RateLimiter:
    """
    Thread-safe in-memory sliding-window rate limiter.
    Stores request timestamps per rate-limit key.
    """

    def __init__(self) -> None:
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def reset(self) -> None:
        """
        Clears all rate-limiting state. Used for test isolation.
        """
        with self._lock:
            self._requests.clear()

    def check_rate_limit(self, key: str, max_requests: int, window_seconds: int) -> None:
        """
        Checks if the request count for `key` exceeds `max_requests` in `window_seconds`.
        Raises HTTP 429 with Retry-After header if limit exceeded.
        Otherwise appends current timestamp.
        """
        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            # Clean expired timestamps for this key
            timestamps = [t for t in self._requests[key] if t > cutoff]

            if len(timestamps) >= max_requests:
                oldest = timestamps[0]
                retry_after = max(1, math.ceil(oldest + window_seconds - now))
                # Store cleaned list back
                self._requests[key] = timestamps
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Please try again later.",
                    headers={"Retry-After": str(retry_after)},
                )

            timestamps.append(now)
            self._requests[key] = timestamps


# Global rate limiter instance
limiter = RateLimiter()


def rate_limit_by_ip(max_requests: int, window_seconds: int, scope: str = "default") -> Callable:
    """
    FastAPI dependency factory for unauthenticated IP-based rate limiting.
    Extracts client IP address using request.client.host.
    """
    def dependency(request: Request) -> None:
        client_ip = request.client.host if request.client else "127.0.0.1"
        key = f"{scope}:{client_ip}"
        limiter.check_rate_limit(key, max_requests, window_seconds)

    return dependency


def rate_limit_by_user(max_requests: int, window_seconds: int, scope: str = "default") -> Callable:
    """
    FastAPI dependency factory for authenticated user-based rate limiting.
    Uses current_user.user_id obtained via verified Supabase JWT token.
    """
    def dependency(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        key = f"{scope}:{current_user.user_id}"
        limiter.check_rate_limit(key, max_requests, window_seconds)
        return current_user

    return dependency
