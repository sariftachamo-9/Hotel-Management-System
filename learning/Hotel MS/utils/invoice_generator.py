from datetime import datetime
from models import db, Invoice

def generate_invoice_number():
    """Generate unique invoice number"""
    # Format: INV-YYYYMMDD-XXXX
    today = datetime.now()
    prefix = f"INV-{today.strftime('%Y%m%d')}"
    
    # Get last invoice number for today
    last_invoice = Invoice.query.filter(
        Invoice.invoice_number.like(f"{prefix}%")
    ).order_by(Invoice.id.desc()).first()
    
    if last_invoice:
        # Extract sequence number and increment
        last_seq = int(last_invoice.invoice_number.split('-')[-1])
        seq = last_seq + 1
    else:
        seq = 1
    
    return f"{prefix}-{seq:04d}"

def calculate_invoice_totals(room_charges, service_charges, tax_rate, discount=0.0):
    """Calculate invoice totals"""
    subtotal = room_charges + service_charges
    tax_amount = (subtotal - discount) * (tax_rate / 100)
    total_amount = subtotal + tax_amount - discount
    
    return {
        'subtotal': round(subtotal, 2),
        'tax_amount': round(tax_amount, 2),
        'total_amount': round(total_amount, 2)
    }
