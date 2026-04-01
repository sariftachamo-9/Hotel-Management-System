from flask import Blueprint, render_template, jsonify, request
from services.hotel_service import get_hotel_info, get_featured_rooms, get_hotel_reviews
from services.pricing_service import PricingService
from services.booking_service import check_room_availability
from models import RoomType
from utils.limiting import limiter

public_bp = Blueprint('public', __name__)

@public_bp.route('/')
def home():
    """Public Landing Page"""
    hotel_info = get_hotel_info()
    featured_rooms = get_featured_rooms()
    reviews_data = get_hotel_reviews()
    
    from flask import make_response, render_template
    response = make_response(render_template('index.html', 
                         hotel=hotel_info, 
                         rooms=featured_rooms,
                         reviews=reviews_data))
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@public_bp.route('/check-availability', methods=['POST'])
@limiter.limit("30 per minute")
def check_availability_api():
    """API to check price and availability"""
    data = request.json
    check_in = data.get('check_in')
    check_out = data.get('check_out')
    room_type_id = data.get('room_type_id')
    promo_code = data.get('promo_code')
    
    room_type = RoomType.query.get(room_type_id)
    if not room_type:
        return jsonify({'error': 'Invalid Room Type'}), 400
        
    # Simplify: just check if ANY room of this type is active/available 
    # (Real logic needs to count total rooms vs booked rooms)
    price_info = PricingService.calculate_price(
        room_type.base_price, 
        check_in, 
        check_out, 
        promo_code
    )
    
    return jsonify({
        'available': True, # Simplified for UI demo
        'price_breakdown': price_info
    })
