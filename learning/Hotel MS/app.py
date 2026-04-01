import os
from datetime import datetime, timezone
from flask import Flask, g, render_template, send_from_directory, session, redirect, url_for, request
from flask_jwt_extended import JWTManager
from sqlalchemy import inspect, text
from config import config
from models import User, db
from auth.decorators import login_required
from utils.security import get_content_security_policy, get_csp_nonce, get_csrf_token, get_security_headers, validate_csrf_token
from utils.limiting import limiter

def create_app(config_name='development'):
    """Application factory"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])

    if config_name == 'production':
        unsafe_defaults = {
            'SECRET_KEY': 'dev-secret-key-change-in-production',
            'JWT_SECRET_KEY': 'jwt-secret-key-change-in-production',
            'ADMIN_MASTER_KEY': 'hotel-admin-master-key',
        }
        for key, fallback in unsafe_defaults.items():
            if app.config.get(key) == fallback:
                raise RuntimeError(f"{key} must be set from an environment variable in production.")

    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)
    limiter.init_app(app)

    def ensure_service_usage_order_columns():
        """Backfill newly added service order workflow columns on existing DBs."""
        inspector = inspect(db.engine)
        if 'service_usages' not in inspector.get_table_names():
            return

        existing = {col['name'] for col in inspector.get_columns('service_usages')}
        with db.engine.begin() as conn:
            if 'order_status' not in existing:
                conn.execute(text("ALTER TABLE service_usages ADD COLUMN order_status VARCHAR(20) NOT NULL DEFAULT 'sent'"))
            if 'received_at' not in existing:
                conn.execute(text("ALTER TABLE service_usages ADD COLUMN received_at DATETIME"))
            if 'received_by' not in existing:
                conn.execute(text("ALTER TABLE service_usages ADD COLUMN received_by INTEGER"))

    def ensure_service_option_columns():
        """Backfill structured service option columns on existing DBs."""
        inspector = inspect(db.engine)
        if 'services' not in inspector.get_table_names():
            return

        existing = {col['name'] for col in inspector.get_columns('services')}
        with db.engine.begin() as conn:
            if 'subcategory' not in existing:
                conn.execute(text("ALTER TABLE services ADD COLUMN subcategory VARCHAR(80)"))
            if 'option_variant' not in existing:
                conn.execute(text("ALTER TABLE services ADD COLUMN option_variant VARCHAR(80)"))
            if 'size_category' not in existing:
                conn.execute(text("ALTER TABLE services ADD COLUMN size_category VARCHAR(40)"))

    def ensure_hotel_setting_gallery_columns():
        """Backfill gallery image storage on existing DBs."""
        inspector = inspect(db.engine)
        if 'hotel_settings' not in inspector.get_table_names():
            return

        existing = {col['name'] for col in inspector.get_columns('hotel_settings')}
        with db.engine.begin() as conn:
            if 'gallery_images' not in existing:
                conn.execute(text("ALTER TABLE hotel_settings ADD COLUMN gallery_images TEXT"))
    
    # Create upload folder
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Register blueprints
    from auth import auth_bp
    from routes.admin import admin_bp
    from routes.receptionist import receptionist_bp
    from routes.guest import guest_bp
    from routes.common import common_bp
    from routes.public import public_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(receptionist_bp)
    app.register_blueprint(guest_bp)
    app.register_blueprint(common_bp)
    app.register_blueprint(public_bp)

    with app.app_context():
        db.create_all()
        ensure_service_usage_order_columns()
        ensure_service_option_columns()
        ensure_hotel_setting_gallery_columns()

    @app.after_request
    def add_security_headers(response):
        for header, value in get_security_headers().items():
            response.headers.setdefault(header, value)
        response.headers.setdefault("Content-Security-Policy", get_content_security_policy(get_csp_nonce()))
        response.headers.setdefault("X-Permitted-Cross-Domain-Policies", "none")
        return response

    @app.before_request
    def ensure_csp_nonce():
        if not getattr(g, "csp_nonce", None):
            g.csp_nonce = get_csp_nonce()

    @app.before_request
    def protect_state_changing_requests():
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                return None
            token = request.headers.get("X-CSRFToken") or request.headers.get("X-CSRF-Token") or request.form.get("csrf_token")
            if not validate_csrf_token(token):
                if request.is_json:
                    return {"error": "CSRF token missing or invalid"}, 400
                return render_template("errors/403.html"), 403

    @app.context_processor
    def inject_security_context():
        return {"csrf_token": get_csrf_token(), "csp_nonce": get_csp_nonce()}

    @app.context_processor
    def inject_current_user():
        from auth.decorators import get_current_user_id

        user_id = get_current_user_id()
        user = User.query.get(user_id) if user_id else None
        return {"current_user": user}

    @app.before_request
    def enforce_session_activity_timeout():
        """Log admin users out after 10 minutes of inactivity."""
        user_id = session.get("user_id")
        if not user_id:
            return None

        user = User.query.get(user_id)
        if not user or not user.is_active:
            session.clear()
            return redirect(url_for("auth.login", next=request.path))

        now = datetime.now(timezone.utc).timestamp()
        last_activity = session.get("last_activity")

        if user.role == "Admin" and last_activity is not None:
            try:
                idle_seconds = now - float(last_activity)
            except (TypeError, ValueError):
                idle_seconds = 0
            if idle_seconds >= 600:
                session.clear()
                if request.endpoint in {"auth.login", "auth.register", "auth.logout"} and request.method == "GET":
                    return None
                if request.is_json or request.method != "GET":
                    return ("", 401)
                return redirect(url_for("auth.login", next=request.path))

        session["last_activity"] = now
        session.permanent = True
        return None
    
    # Serve uploaded files
    @app.route('/uploads/<path:filename>')
    @login_required
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return render_template('errors/404.html'), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return render_template('errors/500.html'), 500
    
    return app

if __name__ == '__main__':
    runtime_env = os.environ.get('FLASK_ENV', 'development').strip().lower()
    config_name = 'production' if runtime_env == 'production' else 'development'
    app = create_app(config_name)
    
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")
    
    debug_enabled = os.environ.get('FLASK_DEBUG', '0').strip().lower() in {'1', 'true', 'yes', 'on'}
    host = os.environ.get('FLASK_RUN_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_RUN_PORT', '5000'))
    app.run(debug=debug_enabled and config_name != 'production', host=host, port=port)
