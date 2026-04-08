from models import db, HotelSetting, RoomType, Review
from sqlalchemy import func

def get_hotel_info():
    """Fetch singleton hotel settings"""
    settings = HotelSetting.query.first()
    if not settings:
        return None
    return settings.to_dict()

def get_featured_rooms():
    """Fetch active room types for public listing"""
    room_types = RoomType.query.filter_by(is_active=True).all()
    # In a real app, maybe filter by 'is_featured' flag if added
    return [rt.to_dict() for rt in room_types]

def get_hotel_reviews(limit=5):
    """Fetch recent approved reviews"""
    reviews = Review.query.filter_by(status='approved')\
        .order_by(Review.created_at.desc())\
        .limit(limit).all()
        
    # Calculate aggregations
    avg_rating = db.session.query(func.avg(Review.rating_overall))\
        .filter_by(status='approved').scalar() or 0
        
    return {
        'reviews': [r.to_dict() for r in reviews],
        'average_rating': round(avg_rating, 1),
        'total_count': Review.query.filter_by(status='approved').count()
    }
