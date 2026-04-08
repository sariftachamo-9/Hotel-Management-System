from datetime import datetime, timezone

from flask import request, jsonify, render_template, session, redirect, url_for, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from auth import auth_bp
from models import db, User, Guest
from email_validator import validate_email, EmailNotValidError
from utils.limiting import limiter
from utils.security import (
    clear_auth_failures,
    get_client_ip,
    is_auth_locked,
    record_auth_failure,
    validate_password_strength,
)
from utils.email_utils import build_confirmation_email, send_email


def _email_confirmation_serializer():
    secret_key = current_app.config.get("SECRET_KEY")
    if not secret_key:
        raise RuntimeError("SECRET_KEY is required for email confirmation")
    return URLSafeTimedSerializer(secret_key, salt="email-confirmation")


def _public_base_url():
    base_url = (current_app.config.get("PUBLIC_BASE_URL") or "").strip().rstrip("/")
    if base_url:
        return base_url
    return request.url_root.rstrip("/")


def _login_and_redirect_dashboard(user):
    session.clear()
    session['user_id'] = user.id
    session['last_activity'] = datetime.now(timezone.utc).timestamp()
    session.permanent = True
    if user.role == 'Admin':
        return redirect(url_for('admin.dashboard'))
    if user.role == 'Receptionist':
        return redirect(url_for('receptionist.dashboard'))
    return redirect(url_for('guest.dashboard'))

@auth_bp.route('/register', methods=['GET', 'POST'])
@limiter.limit("5 per hour")
def register():
    """Register a new guest user"""
    if request.method == 'GET':
        return render_template('auth/register.html')
        
    try:
        data = request.get_json(silent=True) or {}
        
        # Validate required fields
        required_fields = ['email', 'password', 'full_name', 'phone', 'id_type', 'id_number']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400

        password_ok, password_error = validate_password_strength(data['password'])
        if not password_ok:
            return jsonify({'error': password_error}), 400
        
        # Validate email
        try:
            valid = validate_email(data['email'])
            email = valid.email.lower()
        except EmailNotValidError as e:
            return jsonify({'error': str(e)}), 400
        
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        # Check if phone already exists
        if Guest.query.filter_by(phone=data['phone']).first():
            return jsonify({'error': 'Phone number already registered'}), 400
        
        # Check if ID number already exists
        if Guest.query.filter_by(id_number=data['id_number']).first():
            return jsonify({'error': 'ID number already registered'}), 400
        
        # Create user
        user = User(email=email, role='Guest', is_active=False)  # Set inactive until confirmed
        user.set_password(data['password'])
        db.session.add(user)
        db.session.flush()
        
        # Create guest profile
        guest = Guest(
            user_id=user.id,
            full_name=data['full_name'],
            phone=data['phone'],
            id_type=data['id_type'],
            id_number=data['id_number'],
            email=email,
            nationality=data.get('nationality'),
            emergency_contact=data.get('emergency_contact'),
            address=data.get('address')
        )
        db.session.add(guest)
        db.session.commit()

        # Send confirmation email
        token = _email_confirmation_serializer().dumps({"user_id": user.id, "email": email})
        confirm_link = f"{_public_base_url()}{url_for('auth.confirm_account_token', token=token)}"
        subject, body, html = build_confirmation_email(confirm_link, email)
        send_email(
            subject=subject,
            recipients=[email],
            body=body,
            html=html
        )

        return jsonify({
            'message': 'Registration successful. Please check your email to confirm your account.',
            'email': email,
            'pending_confirmation_url': url_for("auth.check_email", email=email),
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['GET', 'POST'])
@limiter.limit("10 per minute")
def login():
    """Login user and return JWT tokens"""
    if request.method == 'GET':
        return render_template('auth/login.html')

    try:
        data = request.get_json(silent=True) or {}
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        client_ip = get_client_ip()
        email_key = data['email'].strip().lower()
        if is_auth_locked(client_ip, email_key):
            return jsonify({'error': 'Too many failed login attempts. Please try again later.'}), 429

        user = User.query.filter_by(email=data['email']).first()
        if not user or not user.check_password(data['password']):
            record_auth_failure(client_ip, email_key)
            return jsonify({'error': 'Invalid email or password'}), 401
        if not user.is_active:
            return jsonify({'error': 'Please confirm your email address before signing in.'}), 401
        clear_auth_failures(client_ip, email_key)
        # Create tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        # Store user_id in session for browser navigation
        session.clear()
        session['user_id'] = user.id
        session['last_activity'] = datetime.now(timezone.utc).timestamp()
        session.permanent = True
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/refresh', methods=['POST'])
@limiter.limit("30 per hour")
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        user_id = get_jwt_identity()
        access_token = create_access_token(identity=user_id)
        
        return jsonify({
            'access_token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user.to_dict()
        
        # Include guest profile if user is a guest
        if user.role == 'Guest' and user.guest:
            user_data['guest_profile'] = user.guest.to_dict()
        
        return jsonify(user_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Log out user and clear session"""
    session.clear()
    return redirect(url_for('public.home'))

@auth_bp.route('/heartbeat', methods=['POST'])
def heartbeat():
    """Refresh the server-side activity timestamp for the current session."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    session['last_activity'] = datetime.now(timezone.utc).timestamp()
    return jsonify({'message': 'ok'}), 200

@auth_bp.route('/status', methods=['GET'])
def status():
    """Return the current browser-session auth state."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'authenticated': False}), 200

    user = User.query.get(user_id)
    if not user or not user.is_active:
        session.clear()
        return jsonify({'authenticated': False}), 200

    return jsonify({
        'authenticated': True,
        'role': user.role,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/confirm/<int:user_id>')
def confirm_account(user_id):
    user = User.query.get_or_404(user_id)
    if not user.is_active:
        user.is_active = True
        db.session.commit()
    return _login_and_redirect_dashboard(user)


@auth_bp.route('/confirm/<token>')
def confirm_account_token(token):
    try:
        payload = _email_confirmation_serializer().loads(token, max_age=60 * 60 * 24)
        user_id = payload.get("user_id")
        email = (payload.get("email") or "").strip().lower()
    except SignatureExpired:
        return render_template('auth/confirm_result.html', message='This confirmation link has expired. Please register again to receive a fresh link.'), 400
    except BadSignature:
        return render_template('auth/confirm_result.html', message='This confirmation link is invalid.'), 400

    user = User.query.get_or_404(user_id)
    if user.email.lower() != email:
        return render_template('auth/confirm_result.html', message='This confirmation link does not match your account.'), 400

    if not user.is_active:
        user.is_active = True
        db.session.commit()
    return _login_and_redirect_dashboard(user)


@auth_bp.route('/check-email')
def check_email():
    email = request.args.get('email', '').strip()
    return render_template('auth/check_email.html', email=email)
