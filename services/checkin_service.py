from datetime import datetime
from models import db, Booking, Stay, Room, Payment, AuditLog
from services.booking_service import _clear_auto_cleaning_marker

def perform_checkin(booking_id, advance_payment=0.0, notes=None, user_id=None):
    """Perform check-in for a booking"""
    try:
        # Get booking
        booking = Booking.query.get(booking_id)
        if not booking:
            return None, "Booking not found"
        
        # Validate booking status
        if booking.booking_status == 'checked_in':
            return None, "Booking is already checked in"
        
        if booking.booking_status in ['checked_out', 'cancelled', 'no_show']:
            return None, f"Cannot check in a {booking.booking_status} booking"
        
        # Check if room is available
        room = booking.room
        if room.status == 'occupied':
            # Check if there's an active stay for this room
            active_stay = Stay.query.join(Booking).filter(
                Booking.room_id == room.id,
                Stay.stay_status == 'active'
            ).first()
            
            if active_stay and active_stay.booking_id != booking_id:
                return None, "Room is currently occupied by another guest"
        
        # Create stay record
        stay = Stay(
            booking_id=booking.id,
            actual_check_in=datetime.now(),
            advance_payment=advance_payment,
            stay_status='active',
            notes=notes
        )
        db.session.add(stay)
        db.session.flush()
        
        # Record advance payment if any
        if advance_payment > 0:
            payment = Payment(
                stay_id=stay.id,
                amount=advance_payment,
                payment_method='cash',  # Default, should be passed as parameter
                payment_type='advance',
                created_by=user_id
            )
            db.session.add(payment)
        
        # Update booking status
        booking.booking_status = 'checked_in'
        
        # Update room status
        room.status = 'occupied'
        _clear_auto_cleaning_marker(room)
        
        # Create audit log
        if user_id:
            audit = AuditLog(
                user_id=user_id,
                action_type='check_in',
                entity_type='stay',
                entity_id=stay.id,
                description=f"Checked in guest {booking.guest.full_name} to room {room.room_number}"
            )
            db.session.add(audit)
        
        db.session.commit()
        
        return stay, None
        
    except Exception as e:
        db.session.rollback()
        return None, str(e)

def verify_booking_for_checkin(booking_id):
    """Verify if a booking can be checked in"""
    booking = Booking.query.get(booking_id)
    
    if not booking:
        return False, "Booking not found"
    
    if booking.booking_status == 'checked_in':
        return False, "Booking is already checked in"
    
    if booking.booking_status in ['checked_out', 'cancelled', 'no_show']:
        return False, f"Cannot check in a {booking.booking_status} booking"
    
    # Check if check-in date is today or in the past
    if booking.check_in_date > datetime.now().date():
        return False, f"Check-in date is {booking.check_in_date}, cannot check in yet"
    
    return True, None
