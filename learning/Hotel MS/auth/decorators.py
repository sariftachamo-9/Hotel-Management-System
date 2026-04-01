def get_current_user_id():
    """Utility to get current user ID from JWT or session. Returns None if not authenticated."""
    from flask import session, current_app
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        current_app.logger.info(f"[get_current_user_id] JWT user_id: {user_id}")
        return user_id
    except Exception as e:
        user_id = session.get('user_id')
        # Extra check: if user_id is not in session, treat as logged out
        if not user_id:
            current_app.logger.info(f"[get_current_user_id] No user_id in session. User is not authenticated.")
            return None
        current_app.logger.info(f"[get_current_user_id] Session user_id: {user_id} (Exception: {e})")
        return user_id
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models import User

def admin_required(fn):
    """Decorator to require admin role"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        from flask import session, redirect, url_for, request as flask_request
        # Try JWT first (API/AJAX)
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
        except Exception:
            # Fallback to session for browser navigation
            user_id = session.get('user_id')
            if not user_id:
                # Redirect to login page if not authenticated
                return redirect(url_for('auth.login', next=flask_request.path))
        user = User.query.get(user_id)
        if not user or user.role != 'Admin':
            return redirect(url_for('auth.login', next=flask_request.path))
        return fn(*args, **kwargs)
    return wrapper

def receptionist_required(fn):
    """Decorator to require receptionist role"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'Receptionist':
            return jsonify({'error': 'Receptionist access required'}), 403
        
        return fn(*args, **kwargs)
    return wrapper

def staff_required(fn):
    """Decorator to require admin or receptionist role"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role not in ['Admin', 'Receptionist']:
            return jsonify({'error': 'Staff access required'}), 403
        
        return fn(*args, **kwargs)
    return wrapper

def guest_required(fn):
    """Decorator to require guest role"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        from flask import session, redirect, url_for, request as flask_request
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
        except Exception:
            user_id = session.get('user_id')
            if not user_id:
                return redirect(url_for('auth.login', next=flask_request.path))
        user = User.query.get(user_id)
        if not user or user.role != 'Guest':
            return redirect(url_for('auth.login', next=flask_request.path))
        return fn(*args, **kwargs)
    return wrapper

def login_required(fn):
    """Decorator to require any authenticated user"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        from flask import session, redirect, url_for, request as flask_request
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
        except Exception:
            user_id = session.get('user_id')
            if not user_id:
                return redirect(url_for('auth.login', next=flask_request.path))
        user = User.query.get(user_id)
        if not user or not user.is_active:
            return redirect(url_for('auth.login', next=flask_request.path))
        return fn(*args, **kwargs)
    return wrapper
