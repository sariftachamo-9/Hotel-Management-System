from flask import jsonify, request
from routes.common import common_bp
from models import RoomType, Room, Service
from services.booking_service import check_room_availability
from utils.date_utils import parse_date

@common_bp.route('/room-types', methods=['GET'])
def get_room_types():
    """Get all active room types"""
    try:
        room_types = RoomType.query.filter_by(is_active=True).all()
        return jsonify([rt.to_dict() for rt in room_types]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@common_bp.route('/rooms/available', methods=['GET'])
def get_available_rooms():
    """Get available rooms for given dates"""
    try:
        check_in = request.args.get('check_in')
        check_out = request.args.get('check_out')
        room_type_id = request.args.get('room_type_id', type=int)
        
        if not check_in or not check_out:
            return jsonify({'error': 'check_in and check_out dates are required'}), 400
        
        check_in_date = parse_date(check_in)
        check_out_date = parse_date(check_out)
        
        if not check_in_date or not check_out_date:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Get all active rooms
        query = Room.query.filter_by(is_active=True)
        
        if room_type_id:
            query = query.filter_by(room_type_id=room_type_id)
        
        rooms = query.all()
        
        # Filter available rooms
        available_rooms = []
        for room in rooms:
            is_available, _ = check_room_availability(room.id, check_in_date, check_out_date)
            if is_available:
                available_rooms.append(room.to_dict())
        
        return jsonify(available_rooms), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@common_bp.route('/services', methods=['GET'])
def get_services():
    """Get all active services"""
    try:
        category = request.args.get('category')
        if category:
            category = category.strip().lower()
            if category == 'vehicles':
                category = 'vehicle'
            if category == 'liquors':
                category = 'liquor'
        
        query = Service.query.filter_by(is_active=True)
        
        if category:
            query = query.filter_by(category=category)
        
        services = query.all()
        return jsonify([s.to_dict() for s in services]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
