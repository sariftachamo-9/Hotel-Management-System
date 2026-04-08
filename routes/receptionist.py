from flask import Blueprint

receptionist_bp = Blueprint('receptionist', __name__, url_prefix='/api/receptionist')

from routes import receptionist_routes
