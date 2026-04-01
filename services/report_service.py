from datetime import datetime, timedelta
from sqlalchemy import func, and_
from models import db, Booking, Stay, Payment, Invoice, Room
from services.booking_service import sync_room_statuses

def get_daily_checkins(date=None):
    """Get check-ins for a specific date"""
    if date is None:
        date = datetime.now().date()
    
    checkins = Stay.query.filter(
        func.date(Stay.actual_check_in) == date
    ).all()
    
    return [stay.to_dict() for stay in checkins]

def get_daily_checkouts(date=None):
    """Get check-outs for a specific date"""
    if date is None:
        date = datetime.now().date()
    
    checkouts = Stay.query.filter(
        func.date(Stay.actual_check_out) == date
    ).all()
    
    return [stay.to_dict() for stay in checkouts]

def get_occupancy_rate(date=None):
    """Calculate occupancy rate for a specific date"""
    if date is None:
        date = datetime.now().date()
    
    # Total rooms
    total_rooms = Room.query.filter_by(is_active=True).count()
    
    if total_rooms == 0:
        return 0.0
    
    # Occupied rooms (bookings that overlap with the date)
    occupied_rooms = Booking.query.filter(
        Booking.booking_status == 'checked_in',
        Booking.check_in_date <= date,
        Booking.check_out_date > date
    ).count()
    
    occupancy_rate = (occupied_rooms / total_rooms) * 100
    return round(occupancy_rate, 2)

def get_revenue_summary(start_date=None, end_date=None):
    """Get revenue summary for a date range"""
    if end_date is None:
        end_date = datetime.now().date()
    
    if start_date is None:
        start_date = end_date - timedelta(days=30)
    
    # Get all invoices in date range
    invoices = Invoice.query.filter(
        func.date(Invoice.generated_at) >= start_date,
        func.date(Invoice.generated_at) <= end_date
    ).all()
    
    total_revenue = sum(inv.total_amount for inv in invoices)
    total_room_charges = sum(inv.room_charges for inv in invoices)
    total_service_charges = sum(inv.service_charges for inv in invoices)
    total_tax = sum(inv.tax_amount for inv in invoices)
    total_discount = sum(inv.discount for inv in invoices)
    
    return {
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_revenue': round(total_revenue, 2),
        'total_room_charges': round(total_room_charges, 2),
        'total_service_charges': round(total_service_charges, 2),
        'total_tax': round(total_tax, 2),
        'total_discount': round(total_discount, 2),
        'invoice_count': len(invoices)
    }

def get_room_utilization():
    """Get room utilization statistics"""
    rooms = Room.query.filter_by(is_active=True).all()
    sync_room_statuses(rooms, commit=True)
    total_rooms = len(rooms)
    
    rooms_by_status = db.session.query(
        Room.status,
        func.count(Room.id)
    ).filter(Room.is_active == True).group_by(Room.status).all()
    
    status_counts = {status: count for status, count in rooms_by_status}
    
    return {
        'total_rooms': total_rooms,
        'available': status_counts.get('available', 0),
        'occupied': status_counts.get('occupied', 0),
        'reserved': status_counts.get('reserved', 0),
        'cleaning': status_counts.get('cleaning', 0),
        'maintenance': status_counts.get('maintenance', 0)
    }

def get_guest_history(guest_id):
    """Get booking and stay history for a guest"""
    bookings = Booking.query.filter_by(guest_id=guest_id).order_by(Booking.created_at.desc()).all()
    
    history = []
    for booking in bookings:
        booking_data = booking.to_dict()
        
        if booking.stay:
            booking_data['stay'] = booking.stay.to_dict()
            
            if booking.stay.invoice:
                booking_data['invoice'] = booking.stay.invoice.to_dict()
        
        history.append(booking_data)
    
    return history
