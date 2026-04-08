from flask import jsonify, request
from routes.receptionist import receptionist_bp
from auth.decorators import staff_required, get_current_user_id
from models import db, Guest, Booking, Stay, Payment
from services.booking_service import create_booking, cancel_booking
from services.checkin_service import perform_checkin, verify_booking_for_checkin
from services.checkout_service import perform_checkout, get_checkout_summary
from services.billing_service import add_service_to_stay
from utils.date_utils import parse_date
from utils.file_handler import save_uploaded_file
from utils.security import validate_password_strength
from flask import current_app

# Guest Management
@receptionist_bp.route('/guests', methods=['GET'])
@staff_required
def get_guests():
    """Get all guests"""
    try:
        search = request.args.get('search')
        query = Guest.query
        
        if search:
            query = query.filter(
                db.or_(
                    Guest.full_name.ilike(f'%{search}%'),
                    Guest.phone.ilike(f'%{search}%'),
                    Guest.id_number.ilike(f'%{search}%')
                )
            )
        
        guests = query.all()
        return jsonify([guest.to_dict() for guest in guests]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@receptionist_bp.route('/guests', methods=['POST'])
@staff_required
def register_guest():
    """Register a new guest"""
    try:
        from models import User
        
        data = request.form.to_dict()
        
        required_fields = ['email', 'password', 'full_name', 'phone', 'id_type', 'id_number']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if user exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        if Guest.query.filter_by(phone=data['phone']).first():
            return jsonify({'error': 'Phone number already registered'}), 400
        
        if Guest.query.filter_by(id_number=data['id_number']).first():
            return jsonify({'error': 'ID number already registered'}), 400
        
        # Handle file upload
        id_document_path = None
        if 'id_document' in request.files:
            file = request.files['id_document']
            filepath, error = save_uploaded_file(
                file,
                current_app.config['UPLOAD_FOLDER'],
                current_app.config['ALLOWED_EXTENSIONS']
            )
            if error:
                return jsonify({'error': error}), 400
            id_document_path = filepath
        
        # Create user
        password_ok, password_error = validate_password_strength(data['password'])
        if not password_ok:
            return jsonify({'error': password_error}), 400
        user = User(email=data['email'], role='Guest')
        user.set_password(data['password'])
        db.session.add(user)
        db.session.flush()
        
        # Create guest
        guest = Guest(
            user_id=user.id,
            full_name=data['full_name'],
            phone=data['phone'],
            id_type=data['id_type'],
            id_number=data['id_number'],
            email=data.get('email'),
            nationality=data.get('nationality'),
            emergency_contact=data.get('emergency_contact'),
            address=data.get('address'),
            id_document_path=id_document_path
        )
        db.session.add(guest)
        db.session.commit()
        
        return jsonify({'message': 'Guest registered successfully', 'guest': guest.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@receptionist_bp.route('/guests/<int:guest_id>', methods=['GET'])
@staff_required
def get_guest(guest_id):
    """Get guest details"""
    try:
        guest = Guest.query.get(guest_id)
        if not guest:
            return jsonify({'error': 'Guest not found'}), 404
        
        return jsonify(guest.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Booking Management
@receptionist_bp.route('/bookings', methods=['GET'])
@staff_required
def get_bookings():
    """Get all bookings"""
    try:
        status = request.args.get('status')
        query = Booking.query
        
        if status:
            query = query.filter_by(booking_status=status)
        
        bookings = query.order_by(Booking.created_at.desc()).all()
        return jsonify([booking.to_dict() for booking in bookings]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@receptionist_bp.route('/bookings', methods=['POST'])
@staff_required
def create_new_booking():
    """Create a new booking"""
    try:
        data = request.get_json()
        user_id = get_current_user_id()
        
        required_fields = ['guest_id', 'room_id', 'check_in_date', 'check_out_date', 'num_guests']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        check_in_date = parse_date(data['check_in_date'])
        check_out_date = parse_date(data['check_out_date'])
        
        if not check_in_date or not check_out_date:
            return jsonify({'error': 'Invalid date format'}), 400
        
        booking, error = create_booking(
            guest_id=data['guest_id'],
            room_id=data['room_id'],
            check_in_date=check_in_date,
            check_out_date=check_out_date,
            num_guests=data['num_guests'],
            created_by=user_id,
            booking_type=data.get('booking_type', 'advance'),
            special_requests=data.get('special_requests')
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({'message': 'Booking created successfully', 'booking': booking.to_dict()}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@receptionist_bp.route('/bookings/<int:booking_id>', methods=['GET'])
@staff_required
def get_booking(booking_id):
    """Get booking details"""
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        return jsonify(booking.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@receptionist_bp.route('/bookings/<int:booking_id>/cancel', methods=['POST'])
@staff_required
def cancel_booking_route(booking_id):
    """Cancel a booking"""
    try:
        success, error = cancel_booking(booking_id)
        
        if not success:
            return jsonify({'error': error}), 400
        
        return jsonify({'message': 'Booking cancelled successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Check-in
@receptionist_bp.route('/checkin/verify/<int:booking_id>', methods=['GET'])
@staff_required
def verify_checkin(booking_id):
    """Verify if booking can be checked in"""
    try:
        can_checkin, error = verify_booking_for_checkin(booking_id)
        
        if not can_checkin:
            return jsonify({'can_checkin': False, 'error': error}), 200
        
        booking = Booking.query.get(booking_id)
        return jsonify({
            'can_checkin': True,
            'booking': booking.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@receptionist_bp.route('/checkin', methods=['POST'])
@staff_required
def checkin():
    """Perform check-in"""
    try:
        data = request.get_json()
        user_id = get_current_user_id()
        
        if 'booking_id' not in data:
            return jsonify({'error': 'booking_id is required'}), 400
        
        stay, error = perform_checkin(
            booking_id=data['booking_id'],
            advance_payment=data.get('advance_payment', 0.0),
            notes=data.get('notes'),
            user_id=user_id
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({'message': 'Check-in successful', 'stay': stay.to_dict()}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Check-out
@receptionist_bp.route('/checkout/summary/<int:stay_id>', methods=['GET'])
@staff_required
def checkout_summary(stay_id):
    """Get checkout summary"""
    try:
        discount = request.args.get('discount', type=float, default=0.0)
        
        summary, error = get_checkout_summary(stay_id, discount)
        
        if error:
            return jsonify({'error': error}), 404
        
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@receptionist_bp.route('/checkout', methods=['POST'])
@staff_required
def checkout():
    """Perform check-out"""
    try:
        data = request.get_json()
        user_id = get_current_user_id()
        
        if 'stay_id' not in data:
            return jsonify({'error': 'stay_id is required'}), 400
        
        invoice, error = perform_checkout(
            stay_id=data['stay_id'],
            payment_method=data.get('payment_method', 'cash'),
            discount=data.get('discount', 0.0),
            notes=data.get('notes'),
            user_id=user_id
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({'message': 'Check-out successful', 'invoice': invoice.to_dict()}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Service Management
@receptionist_bp.route('/stays/<int:stay_id>/services', methods=['POST'])
@staff_required
def add_service(stay_id):
    """Add service to stay"""
    try:
        data = request.get_json()
        
        if 'service_id' not in data:
            return jsonify({'error': 'service_id is required'}), 400
        
        service_usage, error = add_service_to_stay(
            stay_id=stay_id,
            service_id=data['service_id'],
            quantity=data.get('quantity', 1),
            notes=data.get('notes')
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({'message': 'Service added successfully', 'service_usage': service_usage.to_dict()}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Active Stays
@receptionist_bp.route('/stays/active', methods=['GET'])
@staff_required
def get_active_stays():
    """Get all active stays"""
    try:
        stays = Stay.query.filter_by(stay_status='active').all()
        return jsonify([stay.to_dict() for stay in stays]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
