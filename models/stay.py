from datetime import datetime
from . import db

class Stay(db.Model):
    __tablename__ = 'stays'
    
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False, unique=True)
    actual_check_in = db.Column(db.DateTime, nullable=False)
    actual_check_out = db.Column(db.DateTime)
    advance_payment = db.Column(db.Float, default=0.0, nullable=False)
    stay_status = db.Column(db.String(20), default='active', nullable=False)  # active, completed
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    service_usages = db.relationship('ServiceUsage', backref='stay', cascade='all, delete-orphan')
    payments = db.relationship('Payment', backref='stay', cascade='all, delete-orphan')
    invoice = db.relationship('Invoice', backref='stay', uselist=False, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert stay to dictionary"""
        return {
            'id': self.id,
            'booking_id': self.booking_id,
            'actual_check_in': self.actual_check_in.isoformat() if self.actual_check_in else None,
            'actual_check_out': self.actual_check_out.isoformat() if self.actual_check_out else None,
            'advance_payment': self.advance_payment,
            'stay_status': self.stay_status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Stay {self.id} - {self.stay_status}>'
