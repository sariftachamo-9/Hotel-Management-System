from datetime import datetime
from . import db

class RoomType(db.Model):
    __tablename__ = 'room_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    base_price = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    amenities = db.Column(db.Text)  # JSON string of amenities
    
    # New Detailed Fields
    bed_type = db.Column(db.String(50)) # e.g., "King", "Twin", "Queen"
    room_size_sqm = db.Column(db.Integer)
    cancellation_policy = db.Column(db.Text)
    
    image_path = db.Column(db.String(255))
    category = db.Column(db.String(50), default='Standard') # New field for filtering
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    rooms = db.relationship('Room', backref='room_type', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert room type to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'capacity': self.capacity,
            'base_price': self.base_price,
            'description': self.description,
            'bed_type': self.bed_type,
            'size': self.room_size_sqm,
            'amenities': self.amenities, # Expecting frontend to parse JSON string if needed
            'policy': self.cancellation_policy,
            'image_path': self.image_path,
            'is_active': self.is_active
        }
    
    def __repr__(self):
        return f'<RoomType {self.name}>'

class Room(db.Model):
    __tablename__ = 'rooms'
    
    id = db.Column(db.Integer, primary_key=True)
    room_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    room_type_id = db.Column(db.Integer, db.ForeignKey('room_types.id'), nullable=False)
    floor = db.Column(db.Integer)
    status = db.Column(db.String(20), default='available', nullable=False)  # available, reserved, occupied, cleaning, maintenance
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bookings = db.relationship('Booking', backref='room', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert room to dictionary"""
        return {
            'id': self.id,
            'room_number': self.room_number,
            'room_type_id': self.room_type_id,
            'room_type': self.room_type.to_dict() if self.room_type else None,
            'floor': self.floor,
            'status': self.status,
            'notes': self.notes,
            'is_active': self.is_active,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Room {self.room_number} ({self.status})>'
