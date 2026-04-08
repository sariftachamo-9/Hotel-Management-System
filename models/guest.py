from datetime import datetime
from . import db

class Guest(db.Model):
    __tablename__ = 'guests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    full_name = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False, index=True)
    id_type = db.Column(db.String(20), nullable=False)  # citizenship, passport
    id_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120))
    nationality = db.Column(db.String(50))
    emergency_contact = db.Column(db.String(20))
    id_document_path = db.Column(db.String(255))
    address = db.Column(db.Text)
    date_of_birth = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bookings = db.relationship('Booking', backref='guest', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert guest to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'full_name': self.full_name,
            'phone': self.phone,
            'id_type': self.id_type,
            'id_number': self.id_number,
            'email': self.email,
            'nationality': self.nationality,
            'emergency_contact': self.emergency_contact,
            'address': self.address,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Guest {self.full_name} ({self.phone})>'
