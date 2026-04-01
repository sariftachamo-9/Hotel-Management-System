import sys
import os

# If run directly, verify app context and exit to avoid double definition
if __name__ == '__main__':
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from app import create_app
    app = create_app()
    with app.app_context():
        print("Booking model loaded successfully.")
    sys.exit(0)

from datetime import datetime
from . import db

class Booking(db.Model):
    __tablename__ = 'bookings'
    
    id = db.Column(db.Integer, primary_key=True)
    guest_id = db.Column(db.Integer, db.ForeignKey('guests.id'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    check_in_date = db.Column(db.Date, nullable=False, index=True)
    check_out_date = db.Column(db.Date, nullable=False, index=True)
    num_guests = db.Column(db.Integer, nullable=False)
    booking_status = db.Column(db.String(20), default='pending', nullable=False)  # pending, confirmed, checked_in, checked_out, cancelled, no_show
    booking_type = db.Column(db.String(20), default='advance', nullable=False)  # advance, walk_in
    special_requests = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    stay = db.relationship('Stay', backref='booking', uselist=False, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert booking to dictionary"""
        return {
            'id': self.id,
            'guest_id': self.guest_id,
            'guest_name': self.guest.full_name if self.guest else None,
            'room_id': self.room_id,
            'room_number': self.room.room_number if self.room else None,
            'room_type': self.room.room_type.name if self.room and self.room.room_type else None,
            'check_in_date': self.check_in_date.isoformat() if self.check_in_date else None,
            'check_out_date': self.check_out_date.isoformat() if self.check_out_date else None,
            'num_guests': self.num_guests,
            'booking_status': self.booking_status,
            'booking_type': self.booking_type,
            'special_requests': self.special_requests,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Booking {self.id} - {self.booking_status}>'
