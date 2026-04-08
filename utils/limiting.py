import logging
import os
from functools import wraps

try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
except ImportError:  # pragma: no cover - keeps the app bootable when optional dependency is missing
    Limiter = None
    get_remote_address = None


class _NoOpLimiter:
    """Fallback limiter used when Flask-Limiter is unavailable."""

    def init_app(self, app):
        return None

    def limit(self, *args, **kwargs):
        def decorator(func):
            @wraps(func)
            def wrapped(*f_args, **f_kwargs):
                return func(*f_args, **f_kwargs)

            return wrapped

        return decorator


if Limiter is None:
    logging.getLogger(__name__).warning("Flask-Limiter is not installed; rate limiting is disabled.")
    limiter = _NoOpLimiter()
else:
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["300 per day", "60 per hour"],
        storage_uri=os.environ.get("RATELIMIT_STORAGE_URI", "memory://"),
    )
