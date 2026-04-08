from datetime import datetime
from models import db, Stay, Booking, Room, Invoice, Payment, AuditLog
from services.billing_service import calculate_total_bill
from services.booking_service import set_room_auto_cleaning
from utils.invoice_generator import generate_invoice_number

def perform_checkout(stay_id, payment_method='cash', discount=0.0, notes=None, user_id=None):
    """Perform check-out for a stay"""
    try:
        # Get stay
        stay = Stay.query.get(stay_id)
        if not stay:
            return None, "Stay not found"
        
        # Validate stay status
        if stay.stay_status == 'completed':
            return None, "Stay is already checked out"
        
        # Set check-out time
        stay.actual_check_out = datetime.now()
        
        # Calculate total bill
        bill_details = calculate_total_bill(stay, discount)
        
        # Calculate balance (total - already paid)
        total_paid = sum(p.amount for p in stay.payments)
        balance = bill_details['total_amount'] - total_paid
        
        # Record final payment if there's a balance
        if balance > 0:
            payment = Payment(
                stay_id=stay.id,
                amount=balance,
                payment_method=payment_method,
                payment_type='final',
                created_by=user_id
            )
            db.session.add(payment)
            total_paid += balance
        
        # Generate invoice
        invoice_number = generate_invoice_number()
        invoice = Invoice(
            invoice_number=invoice_number,
            stay_id=stay.id,
            room_charges=bill_details['room_charges'],
            service_charges=bill_details['service_charges'],
            subtotal=bill_details['subtotal'],
            tax_amount=bill_details['tax_amount'],
            discount=discount,
            total_amount=bill_details['total_amount'],
            amount_paid=total_paid,
            balance=0.0,
            generated_by=user_id,
            notes=notes
        )
        db.session.add(invoice)
        
        # Update stay status
        stay.stay_status = 'completed'
        
        # Update booking status
        booking = stay.booking
        booking.booking_status = 'checked_out'
        
        # Update room status
        room = booking.room
        set_room_auto_cleaning(room)
        
        # Create audit log
        if user_id:
            audit = AuditLog(
                user_id=user_id,
                action_type='check_out',
                entity_type='stay',
                entity_id=stay.id,
                description=f"Checked out guest {booking.guest.full_name} from room {room.room_number}. Invoice: {invoice_number}"
            )
            db.session.add(audit)
        
        db.session.commit()
        
        return invoice, None
        
    except Exception as e:
        db.session.rollback()
        return None, str(e)

def get_checkout_summary(stay_id, discount=0.0):
    """Get checkout summary without performing checkout"""
    try:
        stay = Stay.query.get(stay_id)
        if not stay:
            return None, "Stay not found"
        
        # Calculate bill
        bill_details = calculate_total_bill(stay, discount)
        
        # Calculate payments
        total_paid = sum(p.amount for p in stay.payments)
        balance = bill_details['total_amount'] - total_paid
        
        return {
            **bill_details,
            'amount_paid': total_paid,
            'balance': balance,
            'booking': stay.booking.to_dict(),
            'guest': stay.booking.guest.to_dict()
        }, None
        
    except Exception as e:
        return None, str(e)
