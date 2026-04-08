from collections import defaultdict, deque
import os
import re
import secrets
import time

from flask import request


_AUTH_FAILURES = defaultdict(deque)
_AUTH_WINDOW_SECONDS = int(os.environ.get("AUTH_FAILURE_WINDOW_SECONDS", 15 * 60))
_AUTH_LOCKOUT_SECONDS = int(os.environ.get("AUTH_LOCKOUT_SECONDS", 15 * 60))
_AUTH_MAX_FAILURES = int(os.environ.get("AUTH_MAX_FAILURES", 5))


def env_flag(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def validate_password_strength(password):
    """Return (is_valid, error_message) for the password policy."""
    if not password:
        return False, "Password is required."
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    return True, None


def get_csrf_token():
    from flask import session

    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return token


def validate_csrf_token(token):
    from flask import session
    import secrets

    expected = session.get("csrf_token")
    if not expected or not token:
        return False
    return secrets.compare_digest(str(expected), str(token))


def get_csp_nonce():
    from flask import g

    nonce = getattr(g, "csp_nonce", None)
    if not nonce:
        nonce = secrets.token_urlsafe(16)
        g.csp_nonce = nonce
    return nonce


def get_client_ip():
    if env_flag("TRUST_PROXY_HEADERS", False):
        forwarded_for = request.headers.get("X-Forwarded-For", "")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        connecting_ip = request.headers.get("CF-Connecting-IP")
        if connecting_ip:
            return connecting_ip.strip()
    return request.headers.get("X-Real-IP") or request.remote_addr or "unknown"


def _failure_keys(ip, identifier=None):
    keys = [f"ip:{ip}"]
    if identifier:
        keys.append(f"ip:{ip}|id:{identifier.strip().lower()}")
    return keys


def _purge_old_failures(entries):
    cutoff = time.time() - _AUTH_WINDOW_SECONDS
    while entries and entries[0] < cutoff:
        entries.popleft()


def is_auth_locked(ip, identifier=None):
    now = time.time()
    for key in _failure_keys(ip, identifier):
        entries = _AUTH_FAILURES.get(key)
        if not entries:
            continue
        _purge_old_failures(entries)
        if not entries:
            _AUTH_FAILURES.pop(key, None)
            continue
        if len(entries) >= _AUTH_MAX_FAILURES and now - entries[-1] < _AUTH_LOCKOUT_SECONDS:
            return True
    return False


def record_auth_failure(ip, identifier=None):
    now = time.time()
    for key in _failure_keys(ip, identifier):
        entries = _AUTH_FAILURES[key]
        _purge_old_failures(entries)
        entries.append(now)


def clear_auth_failures(ip, identifier=None):
    for key in _failure_keys(ip, identifier):
        _AUTH_FAILURES.pop(key, None)


def get_security_headers():
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
    }


def get_content_security_policy(nonce=None):
    script_src = ["'self'", "https://cdn.jsdelivr.net"]
    if nonce:
        script_src.append(f"'nonce-{nonce}'")
    return (
        "default-src 'self'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'; "
        "object-src 'none'; "
        "img-src 'self' data: https:; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        f"script-src {' '.join(script_src)}; "
        "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com; "
        "connect-src 'self';"
    )
