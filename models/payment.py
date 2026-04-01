from datetime import datetime
from . import db

class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    stay_id = db.Column(db.Integer, db.ForeignKey('stays.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)  # cash, card, upi, bank_transfer
    payment_type = db.Column(db.String(20), nullable=False)  # advance, partial, final
    transaction_id = db.Column(db.String(100))
    payment_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    notes = db.Column(db.Text)
    
    def to_dict(self):
        """Convert payment to dictionary"""
        return {
            'id': self.id,
            'stay_id': self.stay_id,
            'amount': self.amount,
            'payment_method': self.payment_method,
            'payment_type': self.payment_type,
            'transaction_id': self.transaction_id,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'notes': self.notes
        }
    
    def __repr__(self):
        return f'<Payment {self.id} - {self.amount}>'
