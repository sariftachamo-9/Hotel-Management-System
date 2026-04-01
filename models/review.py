from . import db
from datetime import datetime

class Review(db.Model):
    __tablename__ = 'reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Optional: allows guest users
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=True) # Verify stay
    
    guest_name = db.Column(db.String(100)) # Display name
    rating_overall = db.Column(db.Integer, nullable=False) # 1-5
    rating_cleanliness = db.Column(db.Integer)
    rating_service = db.Column(db.Integer)
    rating_comfort = db.Column(db.Integer)
    
    comment = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending') # pending, approved, hidden
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'guest_name': self.guest_name,
            'rating': self.rating_overall,
            'breakdown': {
                'cleanliness': self.rating_cleanliness,
                'service': self.rating_service,
                'comfort': self.rating_comfort
            },
            'comment': self.comment,
            'date': self.created_at.strftime('%Y-%m-%d'),
            'status': self.status
        }
