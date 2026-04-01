from datetime import datetime
from . import db

class Service(db.Model):
    __tablename__ = 'services'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50))  # room_service, laundry, minibar, extra_bed, late_checkout, etc.
    subcategory = db.Column(db.String(80))  # breakfast/lunch/snacks/dinner or vodka/rum/beer
    option_variant = db.Column(db.String(80))  # veg/nonveg/vegan when relevant
    size_category = db.Column(db.String(40))  # small/medium/large or bottle size when relevant
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    service_usages = db.relationship('ServiceUsage', backref='service', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert service to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'category': self.category,
            'subcategory': self.subcategory,
            'option_variant': self.option_variant,
            'size_category': self.size_category,
            'is_active': self.is_active
        }
    
    def __repr__(self):
        return f'<Service {self.name}>'

class ServiceUsage(db.Model):
    __tablename__ = 'service_usages'
    
    id = db.Column(db.Integer, primary_key=True)
    stay_id = db.Column(db.Integer, db.ForeignKey('stays.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    total_price = db.Column(db.Float, nullable=False)
    usage_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    notes = db.Column(db.Text)
    order_status = db.Column(db.String(20), default='sent', nullable=False)  # sent, received
    received_at = db.Column(db.DateTime)
    received_by = db.Column(db.Integer)
    
    def to_dict(self):
        """Convert service usage to dictionary"""
        return {
            'id': self.id,
            'stay_id': self.stay_id,
            'service_id': self.service_id,
            'service_name': self.service.name if self.service else None,
            'quantity': self.quantity,
            'total_price': self.total_price,
            'usage_date': self.usage_date.isoformat() if self.usage_date else None,
            'notes': self.notes,
            'order_status': self.order_status,
            'received_at': self.received_at.isoformat() if self.received_at else None,
            'received_by': self.received_by
        }
    
    def __repr__(self):
        return f'<ServiceUsage {self.id}>'
