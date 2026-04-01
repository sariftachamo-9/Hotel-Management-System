from datetime import datetime
from . import db

class Invoice(db.Model):
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    stay_id = db.Column(db.Integer, db.ForeignKey('stays.id'), nullable=False, unique=True)
    room_charges = db.Column(db.Float, nullable=False)
    service_charges = db.Column(db.Float, default=0.0, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    tax_amount = db.Column(db.Float, nullable=False)
    discount = db.Column(db.Float, default=0.0, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    amount_paid = db.Column(db.Float, nullable=False)
    balance = db.Column(db.Float, nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    notes = db.Column(db.Text)
    
    def to_dict(self):
        """Convert invoice to dictionary"""
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'stay_id': self.stay_id,
            'room_charges': self.room_charges,
            'service_charges': self.service_charges,
            'subtotal': self.subtotal,
            'tax_amount': self.tax_amount,
            'discount': self.discount,
            'total_amount': self.total_amount,
            'amount_paid': self.amount_paid,
            'balance': self.balance,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            'notes': self.notes
        }
    
    def __repr__(self):
        return f'<Invoice {self.invoice_number}>'
