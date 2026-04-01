from . import db
from datetime import datetime

class PricingRule(db.Model):
    __tablename__ = 'pricing_rules'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100)) # e.g. "Summer Season", "Weekend Hike"
    start_date = db.Column(db.Date) # Optional, for ranges
    end_date = db.Column(db.Date)
    
    # Days of week (0=Mon, 6=Sun) - customized logic later or simple comma list "5,6"
    days_of_week = db.Column(db.String(20)) 
    
    price_multiplier = db.Column(db.Float, default=1.0) # e.g. 1.2 for 20% increase
    is_active = db.Column(db.Boolean, default=True)

class PromoCode(db.Model):
    __tablename__ = 'promo_codes'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    discount_percent = db.Column(db.Float, default=0.0) # 0-100
    max_discount_amount = db.Column(db.Float) # Cap the discount
    
    valid_from = db.Column(db.DateTime)
    valid_until = db.Column(db.DateTime)
    usage_limit = db.Column(db.Integer)
    used_count = db.Column(db.Integer, default=0)
    
    is_active = db.Column(db.Boolean, default=True)
