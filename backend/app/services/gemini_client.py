"""Rate-limited Gemini client shared by all cloud fallback paths."""

from collections import deque
from threading import Lock
import logging
import time
from typing import Any, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

_request_times: deque[float] = deque()
_limiter_lock = Lock()


def _acquire_slot() -> bool:
    """Reserve a request slot, waiting only up to the configured maximum."""
    now = time.monotonic()
    window_start = now - 60.0

    with _limiter_lock:
        while _request_times and _request_times[0] <= window_start:
            _request_times.popleft()

        if len(_request_times) >= settings.GEMINI_RPM_LIMIT:
            wait_seconds = _request_times[0] + 60.0 - now
            if wait_seconds > settings.GEMINI_MAX_WAIT_SECONDS:
                logger.warning(
                    "Gemini rate limit reached; request deferred for %.1f seconds",
                    wait_seconds,
                )
                return False
            time.sleep(max(0.0, wait_seconds))
            now = time.monotonic()
            while _request_times and _request_times[0] <= now - 60.0:
                _request_times.popleft()

        _request_times.append(time.monotonic())
        return True


def generate_content(contents: str, config: Optional[Any] = None) -> Optional[Any]:
    """Generate content with one configured, provider-verified model."""
    if not settings.GEMINI_API_KEY:
        return None
    if not _acquire_slot():
        return None

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        kwargs = {"model": settings.GEMINI_MODEL, "contents": contents}
        if config is not None:
            kwargs["config"] = config
        return client.models.generate_content(**kwargs)
    except Exception:
        logger.exception("Gemini request failed using model '%s'", settings.GEMINI_MODEL)
        return None
