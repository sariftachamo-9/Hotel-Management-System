from datetime import date, datetime, timedelta
from models import db, Booking, Room, Stay
from utils.date_utils import check_date_conflict, calculate_nights
from utils.validators import validate_date_range

ACTIVE_STAY_STATUSES = ('active', 'checkout_requested', 'checkout_approved')
MANUAL_BLOCKED_ROOM_STATUSES = {'maintenance'}
TRANSIENT_ROOM_STATUSES = {'available', 'reserved', 'occupied', 'cleaning'}
AUTO_CLEANING_WINDOW = timedelta(minutes=30)
AUTO_CLEANING_MARKER = '[auto-cleaning]'


def _has_manual_cleaning(room):
    return bool(room and room.status == 'cleaning' and room.notes and AUTO_CLEANING_MARKER not in room.notes)


def _mark_auto_cleaning(room):
    if not room:
        return
    existing_notes = room.notes or ''
    if AUTO_CLEANING_MARKER not in existing_notes:
        room.notes = f"{existing_notes}\n{AUTO_CLEANING_MARKER}".strip()


def _clear_auto_cleaning_marker(room):
    if not room or not room.notes or AUTO_CLEANING_MARKER not in room.notes:
        return
    room.notes = '\n'.join(
        line for line in room.notes.splitlines() if line.strip() != AUTO_CLEANING_MARKER
    ).strip() or None


def set_room_auto_cleaning(room):
    if not room:
        return room
    room.status = 'cleaning'
    _mark_auto_cleaning(room)
    return room


def sync_room_status(room):
    """Keep transient room statuses aligned with actual bookings/stays."""
    if not room or not room.is_active or room.status in MANUAL_BLOCKED_ROOM_STATUSES or _has_manual_cleaning(room):
        return room

    today = date.today()
    now = datetime.now()
    active_stay = (
        Stay.query.join(Booking)
        .filter(
            Booking.room_id == room.id,
            Booking.booking_status == 'checked_in',
            Stay.stay_status.in_(ACTIVE_STAY_STATUSES),
        )
        .first()
    )

    if active_stay:
        desired_status = 'occupied'
    else:
        recent_checkout = (
            Stay.query.join(Booking)
            .filter(
                Booking.room_id == room.id,
                Stay.actual_check_out.isnot(None),
            )
            .order_by(Stay.actual_check_out.desc())
            .first()
        )
        if recent_checkout and now - recent_checkout.actual_check_out < AUTO_CLEANING_WINDOW:
            desired_status = 'cleaning'
            _mark_auto_cleaning(room)
        else:
            upcoming_booking = (
                Booking.query.filter(
                    Booking.room_id == room.id,
                    Booking.booking_status.in_(['confirmed', 'pending']),
                    Booking.check_out_date > today,
                )
                .order_by(Booking.check_in_date.asc())
                .first()
            )
            desired_status = 'reserved' if upcoming_booking else 'available'
            _clear_auto_cleaning_marker(room)

    if room.status in TRANSIENT_ROOM_STATUSES and room.status != desired_status:
        room.status = desired_status
        if desired_status != 'cleaning':
            _clear_auto_cleaning_marker(room)

    return room


def sync_room_statuses(rooms, commit=False):
    changed = False
    for room in rooms:
        previous_status = room.status
        sync_room_status(room)
        if room.status != previous_status:
            changed = True

    if changed:
        if commit:
            db.session.commit()
        else:
            db.session.flush()

    return changed

def check_room_availability(room_id, check_in_date, check_out_date, exclude_booking_id=None):
    """Check if a room is available for the given dates"""
    room = Room.query.get(room_id)
    if not room or not room.is_active:
        return False, "Room not found"

    sync_room_status(room)

    if room.status in MANUAL_BLOCKED_ROOM_STATUSES.union({'cleaning'}):
        return False, f"Room is currently under {room.status}"

    # Get all active bookings for this room
    query = Booking.query.filter(
        Booking.room_id == room_id,
        Booking.booking_status.in_(['confirmed', 'checked_in', 'pending'])
    )
    
    if exclude_booking_id:
        query = query.filter(Booking.id != exclude_booking_id)
    
    bookings = query.all()
    
    # Check for date conflicts
    for booking in bookings:
        if check_date_conflict(check_in_date, check_out_date, booking.check_in_date, booking.check_out_date):
            return False, f"Room is already booked from {booking.check_in_date} to {booking.check_out_date}"
    
    return True, None

def create_booking(guest_id, room_id, check_in_date, check_out_date, num_guests, created_by, booking_type='advance', special_requests=None):
    """Create a new booking"""
    try:
        # Validate dates
        is_valid, error = validate_date_range(check_in_date, check_out_date)
        if not is_valid:
            return None, error
        
        # Check room availability
        is_available, error = check_room_availability(room_id, check_in_date, check_out_date)
        if not is_available:
            return None, error
        
        # Check room capacity
        room = Room.query.get(room_id)
        if not room:
            return None, "Room not found"
        
        if num_guests > room.room_type.capacity:
            return None, f"Number of guests exceeds room capacity ({room.room_type.capacity})"
        
        # Calculate pricing
        from services.pricing_service import PricingService
        price_details = PricingService.calculate_price(
            base_price=room.room_type.base_price,
            check_in_date=check_in_date,
            check_out_date=check_out_date,
            promo_code_str=None # Pass promo code if added to create_booking args in future
        )
        
        # Create booking
        booking = Booking(
            guest_id=guest_id,
            room_id=room_id,
            check_in_date=check_in_date,
            check_out_date=check_out_date,
            num_guests=num_guests,
            booking_type=booking_type,
            special_requests=special_requests,
            created_by=created_by,
            booking_status='confirmed',
            # We should ideally store the price snapshot here if Booking model had a price field
            # For now, we assume price is recalculated or stored in Invoice later
        )
        
        # Update room status
        room.status = 'reserved'
        _clear_auto_cleaning_marker(room)
        
        db.session.add(booking)
        db.session.commit()
        
        return booking, None
        
    except Exception as e:
        db.session.rollback()
        return None, str(e)

def cancel_booking(booking_id):
    """Cancel a booking"""
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return False, "Booking not found"
        
        if booking.booking_status in ['checked_in', 'checked_out']:
            return False, "Cannot cancel a booking that is already checked in or checked out"
        
        booking.booking_status = 'cancelled'
        
        # Update room status if no other active bookings
        room = booking.room
        active_bookings = Booking.query.filter(
            Booking.room_id == room.id,
            Booking.booking_status.in_(['confirmed', 'pending']),
            Booking.id != booking_id
        ).count()
        
        if active_bookings == 0:
            room.status = 'available'
            _clear_auto_cleaning_marker(room)
        
        db.session.commit()
        return True, None
        
    except Exception as e:
        db.session.rollback()
        return False, str(e)

def mark_no_show(booking_id):
    """Mark a booking as no-show"""
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return False, "Booking not found"
        
        booking.booking_status = 'no_show'
        
        # Update room status
        room = booking.room
        room.status = 'available'
        _clear_auto_cleaning_marker(room)
        
        db.session.commit()
        return True, None
        
    except Exception as e:
        db.session.rollback()
        return False, str(e)
