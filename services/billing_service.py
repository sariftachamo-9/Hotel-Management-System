from datetime import datetime
from flask import current_app
from models import db, Stay, ServiceUsage
from utils.date_utils import calculate_nights
from utils.invoice_generator import calculate_invoice_totals

def calculate_room_charges(stay):
    """Calculate room charges based on nights stayed"""
    booking = stay.booking
    room = booking.room
    
    # Calculate nights
    check_out_date = stay.actual_check_out or datetime.now()
    nights = calculate_nights(stay.actual_check_in, check_out_date)
    
    # Get base price
    base_price = room.room_type.base_price
    
    # Calculate total room charges
    room_charges = base_price * nights
    
    return room_charges, nights

def calculate_service_charges(stay):
    """Calculate total service charges"""
    service_usages = stay.service_usages
    total_service_charges = sum(usage.total_price for usage in service_usages)
    
    return total_service_charges

def calculate_total_bill(stay, discount=0.0):
    """Calculate complete bill for a stay"""
    # Get tax rate from config
    tax_rate = current_app.config.get('TAX_RATE', 13.0)
    
    # Calculate room charges
    room_charges, nights = calculate_room_charges(stay)
    
    # Calculate service charges
    service_charges = calculate_service_charges(stay)
    
    # Calculate totals
    totals = calculate_invoice_totals(room_charges, service_charges, tax_rate, discount)
    
    return {
        'room_charges': round(room_charges, 2),
        'service_charges': round(service_charges, 2),
        'nights': nights,
        'subtotal': totals['subtotal'],
        'tax_amount': totals['tax_amount'],
        'tax_rate': tax_rate,
        'discount': round(discount, 2),
        'total_amount': totals['total_amount']
    }

def add_service_to_stay(stay_id, service_id, quantity=1, notes=None):
    """Add a service to a stay"""
    try:
        from models import Service
        
        stay = Stay.query.get(stay_id)
        if not stay:
            return None, "Stay not found"
        
        if stay.stay_status != 'active':
            return None, "Can only add services to active stays"
        
        service = Service.query.get(service_id)
        if not service:
            return None, "Service not found"
        
        if not service.is_active:
            return None, "Service is not available"
        
        # Calculate total price
        total_price = service.price * quantity
        
        # Create service usage
        service_usage = ServiceUsage(
            stay_id=stay.id,
            service_id=service.id,
            quantity=quantity,
            total_price=total_price,
            notes=notes,
            order_status='sent'
        )
        
        db.session.add(service_usage)
        db.session.commit()
        
        return service_usage, None
        
    except Exception as e:
        db.session.rollback()
        return None, str(e)
