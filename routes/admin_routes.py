
from routes.admin import admin_bp
from auth.decorators import admin_required
from services.billing_service import calculate_total_bill
from utils.security import validate_password_strength

# Admin approves guest checkout request
@admin_bp.route('/bookings/approve_checkout/<int:booking_id>', methods=['POST'])
@admin_required
def approve_guest_checkout(booking_id):
    from flask import redirect, url_for, flash, session
    from models import Booking, AuditLog, SupportTicket
    booking = Booking.query.get(booking_id)
    if not booking or not booking.stay:
        flash('Booking or stay not found.', 'danger')
        return redirect(url_for('admin.bookings'))
    if booking.stay.stay_status != 'checkout_requested':
        flash('No pending checkout request for this booking.', 'warning')
        return redirect(url_for('admin.bookings'))
    booking.stay.stay_status = 'checkout_approved'
    summary = calculate_total_bill(booking.stay)
    amount_paid = sum(payment.amount for payment in booking.stay.payments)
    balance = round(summary['total_amount'] - amount_paid, 2)
    approval_note = f"[Checkout Approved. Pending settlement: Rs. {balance}]"
    booking.stay.notes = f"{booking.stay.notes}\n{approval_note}".strip() if booking.stay.notes else approval_note
    user_id = session.get('user_id')
    if user_id:
        audit = AuditLog(
            user_id=user_id,
            action_type='approve_checkout',
            entity_type='booking',
            entity_id=booking.id,
            description=f"Approved checkout for booking {booking.id} with pending balance Rs. {balance}"
        )
        db.session.add(audit)
    support_ticket = SupportTicket(
        user_id=booking.guest.user_id,
        subject=f"Checkout Approved: Booking #{booking.id}",
        message=f"Your checkout has been approved. Current settlement balance is Rs. {balance}.",
        status='resolved'
    )
    db.session.add(support_ticket)
    db.session.commit()
    flash(f'Checkout request approved. Pending settlement is Rs. {balance}.', 'success')
    return redirect(url_for('admin.bookings'))

@admin_bp.route('/walkin-checkin', methods=['GET', 'POST'])
@admin_required
def walkin_checkin():
    from flask import request, render_template, redirect, url_for, flash, session
    from models import Guest, Room, SupportTicket, User
    from services.booking_service import create_booking
    from services.checkin_service import perform_checkin
    user_id = session.get('user_id')
    guests = Guest.query.all()
    rooms = Room.query.filter_by(status='available', is_active=True).all()
    selected_guest_id = request.args.get('guest_id', type=int)
    if request.method == 'POST':
        guest_id = request.form.get('guest_id', type=int)
        room_id = request.form.get('room_id', type=int)
        num_guests = request.form.get('num_guests', type=int)
        special_requests = request.form.get('special_requests')
        from datetime import date, datetime, timedelta
        check_in_raw = request.form.get('check_in_date')
        check_out_raw = request.form.get('check_out_date')
        check_in_date = datetime.strptime(check_in_raw, '%Y-%m-%d').date() if check_in_raw else date.today()
        check_out_date = datetime.strptime(check_out_raw, '%Y-%m-%d').date() if check_out_raw else (check_in_date + timedelta(days=1))
        booking, error = create_booking(
            guest_id=guest_id,
            room_id=room_id,
            check_in_date=check_in_date,
            check_out_date=check_out_date,
            num_guests=num_guests,
            created_by=user_id,
            booking_type='walk_in',
            special_requests=special_requests
        )
        if error or not booking:
            flash(f'Booking failed: {error}', 'danger')
            return render_template('admin/walkin_checkin.html', guests=guests, rooms=rooms)
        # Immediately check in
        stay, error2 = perform_checkin(booking.id, user_id=user_id)
        if error2:
            flash(f'Check-in failed: {error2}', 'danger')
        else:
            guest = Guest.query.get(guest_id)
            if guest:
                db.session.add(SupportTicket(
                    user_id=guest.user_id,
                    subject=f'Checked In: Booking #{booking.id}',
                    message=f'You have been checked in by the front desk for room {booking.room.room_number}.',
                    status='resolved'
                ))
                db.session.commit()
            flash('Guest checked in successfully (walk-in).', 'success')
        return redirect(url_for('admin.bookings'))
    return render_template(
        'admin/walkin_checkin.html',
        guests=guests,
        rooms=rooms,
        selected_guest_id=selected_guest_id,
    )
@admin_bp.route('/bookings/checkin/<int:booking_id>', methods=['POST'])
@admin_required
def admin_checkin_booking(booking_id):
    from flask import redirect, url_for, flash, session
    from models import Booking, SupportTicket
    from services.checkin_service import perform_checkin
    user_id = session.get('user_id')
    # You can extend to accept advance_payment/notes from form if needed
    booking = Booking.query.get(booking_id)
    stay, error = perform_checkin(booking_id, user_id=user_id)
    if error:
        flash(f'Check-in failed: {error}', 'danger')
    else:
        if booking and booking.guest:
            db.session.add(SupportTicket(
                user_id=booking.guest.user_id,
                subject=f'Checked In: Booking #{booking.id}',
                message=f'You have been checked in to room {booking.room.room_number if booking.room else booking.room_id}.',
                status='resolved'
            ))
            db.session.commit()
        flash('Guest checked in successfully.', 'success')
    return redirect(url_for('admin.bookings'))

@admin_bp.route('/bookings/checkout/<int:booking_id>', methods=['POST'])
@admin_required
def admin_checkout_booking(booking_id):
    from flask import redirect, url_for, flash, session
    from models import Booking
    from services.checkout_service import perform_checkout
    user_id = session.get('user_id')
    booking = Booking.query.get(booking_id)
    if not booking or not booking.stay:
        flash('Booking or stay not found.', 'danger')
        return redirect(url_for('admin.bookings'))
    # You can extend to accept payment_method/discount/notes from form if needed
    invoice, error = perform_checkout(booking.stay.id, user_id=user_id)
    if error:
        flash(f'Checkout failed: {error}', 'danger')
    else:
        flash('Guest checked out and invoice generated.', 'success')
    return redirect(url_for('admin.bookings'))

from routes.admin import admin_bp
from auth.decorators import admin_required
 # --- Placeholder routes for sidebar links ---

@admin_bp.route('/rooms/update-status/<int:room_id>', methods=['POST'])
@admin_required
def update_room_status(room_id):
    from flask import request, redirect, url_for, flash
    from services.booking_service import _clear_auto_cleaning_marker
    room = Room.query.get(room_id)
    if not room:
        flash('Room not found.', 'danger')
    else:
        new_status = request.form.get('status')
        if new_status:
            room.status = new_status
            if new_status != 'cleaning':
                _clear_auto_cleaning_marker(room)
            db.session.commit()
            flash('Room status updated.', 'success')
        else:
            flash('No status selected.', 'danger')
    return redirect(url_for('admin.rooms'))

@admin_bp.route('/support-tickets', methods=['GET'])
@admin_required
def support_tickets():
    from flask import session
    from models import SupportTicket, User
    user_id = session.get('user_id')
    user = User.query.get(user_id) if user_id else None
    tickets = SupportTicket.query.order_by(SupportTicket.created_at.desc()).all()
    return render_template('admin/support_tickets.html', current_user=user, tickets=tickets)


@admin_bp.route('/service-options', methods=['GET', 'POST'])
@admin_required
def service_options():
    """Admin UI for managing food, vehicle, and liquor service options."""
    from flask import session
    valid_categories = ['food', 'vehicle', 'liquor']
    food_subcategories = ['breakfast', 'lunch', 'snacks', 'dinner']
    food_variants = ['veg', 'nonveg', 'vegan']

    if request.method == 'POST':
        action = request.form.get('action')
        try:
            if action == 'create':
                name = (request.form.get('name') or '').strip()
                category = (request.form.get('category') or '').strip().lower()
                if category == 'vehicles':
                    category = 'vehicle'
                if category == 'liquors':
                    category = 'liquor'
                price = request.form.get('price', type=float)
                description = (request.form.get('description') or '').strip()
                subcategory = (request.form.get('subcategory') or '').strip().lower() or None
                option_variant = (request.form.get('option_variant') or '').strip().lower() or None
                size_category = (request.form.get('size_category') or '').strip().lower() or None

                if category not in valid_categories:
                    flash('Category must be food, vehicle, or liquor.', 'warning')
                    return redirect(url_for('admin.service_options'))

                if price is None:
                    flash('Price is required.', 'warning')
                    return redirect(url_for('admin.service_options'))

                if category == 'food':
                    if subcategory not in food_subcategories:
                        flash('Food type must be breakfast, lunch, snacks, or dinner.', 'warning')
                        return redirect(url_for('admin.service_options'))
                    if option_variant not in food_variants:
                        flash('Food variant must be veg, nonveg, or vegan.', 'warning')
                        return redirect(url_for('admin.service_options'))
                    if not name:
                        name = f"{subcategory.title()} - {option_variant.title()}"
                    size_category = None

                elif category == 'liquor':
                    if not subcategory:
                        flash('Please provide liquor type (e.g., vodka, rum, beer).', 'warning')
                        return redirect(url_for('admin.service_options'))
                    if not size_category:
                        flash('Please provide size category for liquor.', 'warning')
                        return redirect(url_for('admin.service_options'))
                    if not name:
                        name = f"{subcategory.title()} - {size_category.title()}"
                    option_variant = None

                else:
                    if not name:
                        flash('Name is required for vehicle services.', 'warning')
                        return redirect(url_for('admin.service_options'))
                    subcategory = None
                    option_variant = None
                    size_category = None

                service = Service(
                    name=name,
                    category=category,
                    price=price,
                    description=description,
                    subcategory=subcategory,
                    option_variant=option_variant,
                    size_category=size_category,
                    is_active=True
                )
                db.session.add(service)
                db.session.commit()
                flash('Service option added successfully.', 'success')

            elif action == 'update':
                service_id = request.form.get('service_id', type=int)
                service = Service.query.get(service_id)
                if not service:
                    flash('Service option not found.', 'danger')
                    return redirect(url_for('admin.service_options'))

                service.name = (request.form.get('name') or service.name).strip()
                service.description = (request.form.get('description') or '').strip()
                service.price = request.form.get('price', type=float) if request.form.get('price') else service.price
                category = (request.form.get('category') or service.category or '').strip().lower()
                if category == 'vehicles':
                    category = 'vehicle'
                if category == 'liquors':
                    category = 'liquor'
                subcategory = (request.form.get('subcategory') or '').strip().lower() or None
                option_variant = (request.form.get('option_variant') or '').strip().lower() or None
                size_category = (request.form.get('size_category') or '').strip().lower() or None

                if category in valid_categories:
                    service.category = category

                if service.category == 'food':
                    service.subcategory = subcategory if subcategory in food_subcategories else service.subcategory
                    service.option_variant = option_variant if option_variant in food_variants else service.option_variant
                    service.size_category = None
                elif service.category == 'liquor':
                    service.subcategory = subcategory or service.subcategory
                    service.size_category = size_category or service.size_category
                    service.option_variant = None
                else:
                    service.subcategory = None
                    service.option_variant = None
                    service.size_category = None

                db.session.commit()
                flash('Service option updated successfully.', 'success')

            elif action == 'toggle':
                service_id = request.form.get('service_id', type=int)
                service = Service.query.get(service_id)
                if not service:
                    flash('Service option not found.', 'danger')
                    return redirect(url_for('admin.service_options'))

                service.is_active = not service.is_active
                db.session.commit()
                flash('Service option status updated.', 'success')

        except Exception as e:
            db.session.rollback()
            flash(f'Error saving service option: {str(e)}', 'danger')

        return redirect(url_for('admin.service_options'))

    user_id = session.get('user_id')
    user = User.query.get(user_id) if user_id else None
    services = Service.query.order_by(Service.category.asc(), Service.name.asc()).all()
    food_services = [s for s in services if (s.category or '').lower() == 'food']
    vehicle_services = [s for s in services if (s.category or '').lower() == 'vehicle']
    liquor_services = [s for s in services if (s.category or '').lower() == 'liquor']

    return render_template(
        'admin/service_options.html',
        current_user=user,
        food_services=food_services,
        vehicle_services=vehicle_services,
        liquor_services=liquor_services
    )


@admin_bp.route('/service-orders', methods=['GET'])
@admin_required
def service_orders():
    from flask import session

    user_id = session.get('user_id')
    user = User.query.get(user_id) if user_id else None
    orders = ServiceUsage.query.order_by(ServiceUsage.usage_date.desc()).all()
    return render_template('admin/service_orders.html', current_user=user, orders=orders)


@admin_bp.route('/service-orders/<int:usage_id>/receive', methods=['POST'])
@admin_required
def receive_service_order(usage_id):
    from flask import session
    from datetime import datetime

    usage = ServiceUsage.query.get(usage_id)
    if not usage:
        flash('Order not found.', 'danger')
        return redirect(url_for('admin.service_orders'))

    if (usage.order_status or '').lower() == 'received':
        flash('Order already marked as received.', 'info')
        return redirect(url_for('admin.service_orders'))

    usage.order_status = 'received'
    usage.received_at = datetime.utcnow()
    usage.received_by = session.get('user_id')

    guest = usage.stay.booking.guest if usage.stay and usage.stay.booking else None
    room_number = usage.stay.booking.room.room_number if usage.stay and usage.stay.booking and usage.stay.booking.room else 'N/A'
    service_name = usage.service.name if usage.service else 'Service'
    if guest:
        ticket = SupportTicket(
            user_id=guest.user_id,
            subject=f'Order Received: {service_name}',
            message=f'Your order for {service_name} (Room {room_number}) has been received by admin.',
            status='resolved'
        )
        db.session.add(ticket)

    db.session.commit()
    flash('Order marked as received.', 'success')
    return redirect(url_for('admin.service_orders'))
import os
from flask import jsonify, request, render_template, flash, redirect, url_for
@admin_bp.route('/rooms/edit/<int:room_id>', methods=['GET', 'POST'])
@admin_required
def edit_room(room_id):
    from flask import session
    from models import Room, RoomType
    from services.booking_service import _clear_auto_cleaning_marker
    user_id = session.get('user_id')
    user = User.query.get(user_id) if user_id else None
    room = Room.query.get(room_id)
    if not room:
        flash('Room not found.', 'danger')
        return redirect(url_for('admin.rooms'))
    room_types = RoomType.query.all()
    if request.method == 'POST':
        room_number = request.form.get('room_number')
        room_type_id = request.form.get('room_type_id', type=int)
        floor = request.form.get('floor', type=int)
        status = request.form.get('status', 'available')
        is_active = request.form.get('is_active')
        is_active = True if is_active == '1' else False
        # Check for duplicate room number
        existing = Room.query.filter_by(room_number=room_number).first()
        if existing and existing.id != room.id:
            flash('Room number already exists.', 'danger')
            return render_template('admin/edit_room.html', room=room, room_types=room_types, current_user=user)
        room.room_number = room_number
        room.room_type_id = room_type_id
        room.floor = floor
        room.status = status
        if status != 'cleaning':
            _clear_auto_cleaning_marker(room)
        room.is_active = is_active
        db.session.commit()
        flash('Room updated successfully!', 'success')
        return redirect(url_for('admin.rooms'))
    return render_template('admin/edit_room.html', room=room, room_types=room_types, current_user=user)
from flask_jwt_extended import get_jwt_identity
from models import db, User, Guest, Room, RoomType, Service, ServiceUsage, HotelSetting, SupportTicket
from services.report_service import (
    get_daily_checkins, get_daily_checkouts, get_occupancy_rate,
    get_revenue_summary, get_room_utilization
)
from utils.date_utils import parse_date

@admin_bp.route('/rooms', methods=['GET', 'POST'])
@admin_required
def rooms():
    from flask import session, request, redirect, url_for, flash
    from models import Room, RoomType
    from services.booking_service import _clear_auto_cleaning_marker, sync_room_statuses
    user_id = session.get('user_id')
    user = User.query.get(user_id) if user_id else None
    if request.method == 'POST':
        room_number = request.form.get('room_number')
        room_type_id = request.form.get('room_type_id', type=int)
        floor = request.form.get('floor', type=int)
        status = request.form.get('status', 'available')
        if not room_number or not room_type_id:
            flash('Room number and type are required.', 'danger')
        else:
            if Room.query.filter_by(room_number=room_number).first():
                flash('Room number already exists.', 'danger')
            else:
                room = Room(room_number=room_number, room_type_id=room_type_id, floor=floor, status=status, is_active=True)
                if status != 'cleaning':
                    _clear_auto_cleaning_marker(room)
                db.session.add(room)
                db.session.commit()
                flash('Room added successfully!', 'success')
        return redirect(url_for('admin.rooms'))
    rooms = Room.query.order_by(Room.room_number.asc()).all()
    sync_room_statuses(rooms, commit=True)
    room_types = RoomType.query.all()
    return render_template('admin/rooms.html', current_user=user, rooms=rooms, room_types=room_types)

@admin_bp.route('/rooms/delete/<int:room_id>', methods=['POST'])
@admin_required
def delete_room(room_id):
    from flask import redirect, url_for, flash
    room = Room.query.get(room_id)
    if not room:
        flash('Room not found.', 'danger')
    else:
        db.session.delete(room)
        db.session.commit()
        flash('Room deleted.', 'success')
    return redirect(url_for('admin.rooms'))

@admin_bp.route('/bookings', methods=['GET'])
@admin_required
def bookings():
    from flask import session
    from models import Booking, Guest, User, Room
    user_id = session.get('user_id')
    user = User.query.get(user_id) if user_id else None
    bookings = Booking.query.order_by(Booking.id.desc()).all()
    return render_template('admin/bookings.html', current_user=user, bookings=bookings)

@admin_bp.route('/guests', methods=['GET'])
@admin_required
def guests():
    from flask import session
    user_id = session.get('user_id')
    user = User.query.get(user_id) if user_id else None
    guests = Guest.query.all()
    return render_template('admin/guests.html', current_user=user, guests=guests)

@admin_bp.route('/guests/<int:guest_id>/reset-password', methods=['POST'])
@admin_required
def reset_guest_password(guest_id):
    from flask import current_app
    guest = Guest.query.get(guest_id)
    if not guest or not guest.user:
        flash('Guest account not found.', 'danger')
        return redirect(url_for('admin.guests'))

    master_key = request.form.get('master_key', '')
    new_password = request.form.get('new_password', '')
    confirm_password = request.form.get('confirm_password', '')

    if master_key != current_app.config.get('ADMIN_MASTER_KEY'):
        flash('Master key is invalid.', 'danger')
        return redirect(url_for('admin.guests'))
    if len(new_password) < 12:
        flash('New password must be at least 12 characters long.', 'warning')
        return redirect(url_for('admin.guests'))
    password_ok, password_error = validate_password_strength(new_password)
    if not password_ok:
        flash(password_error, 'warning')
        return redirect(url_for('admin.guests'))
    if new_password != confirm_password:
        flash('Password confirmation does not match.', 'warning')
        return redirect(url_for('admin.guests'))

    guest.user.set_password(new_password)
    db.session.commit()
    flash(f'Password updated for {guest.full_name}.', 'success')
    return redirect(url_for('admin.guests'))

@admin_bp.route('/guests/add', methods=['POST'])
@admin_required
def add_guest():
    from flask import session
    user_id = session.get('user_id')
    full_name = request.form.get('full_name')
    phone = request.form.get('phone')
    email = request.form.get('email')
    id_type = request.form.get('id_type')
    id_number = request.form.get('id_number')
    nationality = request.form.get('nationality')
    emergency_contact = request.form.get('emergency_contact')

    if not all([full_name, phone, email, id_type, id_number]):
        flash('Full name, phone, email, ID type, and ID number are required.', 'warning')
        return redirect(url_for('admin.guests'))

    if User.query.filter_by(email=email).first():
        flash('A user with that email already exists.', 'danger')
        return redirect(url_for('admin.guests'))
    if Guest.query.filter_by(phone=phone).first():
        flash('A guest with that phone number already exists.', 'danger')
        return redirect(url_for('admin.guests'))
    if Guest.query.filter_by(id_number=id_number).first():
        flash('A guest with that ID number already exists.', 'danger')
        return redirect(url_for('admin.guests'))

    user = User(email=email, role='Guest')
    password = request.form.get('password') or ''
    password_ok, password_error = validate_password_strength(password)
    if not password_ok:
        flash(password_error, 'warning')
        return redirect(url_for('admin.guests'))
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    guest = Guest(
        user_id=user.id,
        full_name=full_name,
        phone=phone,
        id_type=id_type,
        id_number=id_number,
        email=email,
        nationality=nationality,
        emergency_contact=emergency_contact,
        address=request.form.get('address'),
    )
    db.session.add(guest)
    db.session.commit()
    flash('Guest added successfully. Complete their stay details and check them in.', 'success')
    return redirect(url_for('admin.walkin_checkin', guest_id=guest.id))

@admin_bp.route('/finance', methods=['GET'])
@admin_required
def finance():
    from flask import session
    from models import Payment, Invoice, Stay, Booking
    user_id = session.get('user_id')
    user = User.query.get(user_id) if user_id else None
    payments = Payment.query.order_by(Payment.payment_date.desc()).all()
    invoices = Invoice.query.order_by(Invoice.generated_at.desc()).all()
    approved_checkout_summaries = []
    approved_stays = (
        Stay.query.join(Booking)
        .filter(Stay.stay_status == 'checkout_approved', Booking.booking_status == 'checked_in')
        .order_by(Stay.updated_at.desc())
        .all()
    )
    for stay in approved_stays:
        bill = calculate_total_bill(stay)
        amount_paid = sum(payment.amount for payment in stay.payments)
        approved_checkout_summaries.append({
            'stay_id': stay.id,
            'booking_id': stay.booking_id,
            'guest_name': stay.booking.guest.full_name if stay.booking and stay.booking.guest else 'N/A',
            'room_number': stay.booking.room.room_number if stay.booking and stay.booking.room else 'N/A',
            'total_amount': bill['total_amount'],
            'amount_paid': amount_paid,
            'balance': round(bill['total_amount'] - amount_paid, 2),
            'updated_at': stay.updated_at,
        })
    return render_template(
        'admin/finance.html',
        current_user=user,
        payments=payments,
        invoices=invoices,
        approved_checkout_summaries=approved_checkout_summaries,
    )

@admin_bp.route('/account', methods=['GET'])
@admin_required
def account():
    from flask import session
    user_id = session.get('user_id')
    user = User.query.get(user_id) if user_id else None
    return render_template('admin/account.html', current_user=user)

@admin_bp.route('/staff', methods=['GET'])
@admin_required
def staff():
    from flask import session
    user_id = session.get('user_id')
    user = User.query.get(user_id) if user_id else None
    staff_users = User.query.filter(User.role.in_(['Admin', 'Receptionist'])).order_by(User.created_at.desc()).all()
    return render_template('admin/staff.html', current_user=user, staff_users=staff_users)

@admin_bp.route('/reports', methods=['GET'])
@admin_required
def reports():
    from flask import session
    user_id = session.get('user_id')
    user = User.query.get(user_id) if user_id else None
    revenue = get_revenue_summary()
    room_utilization = get_room_utilization()
    occupancy_rate = get_occupancy_rate()
    today_checkins = get_daily_checkins(None)
    today_checkouts = get_daily_checkouts(None)
    return render_template(
        'admin/reports.html',
        current_user=user,
        revenue=revenue,
        room_utilization=room_utilization,
        occupancy_rate=occupancy_rate,
        today_checkins=today_checkins,
        today_checkouts=today_checkouts,
    )

@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def dashboard():
    """Admin Dashboard Page"""
    from models import AuditLog, Booking, Stay
    # Fetch quick stats for the dashboard widgets
    total_rooms = Room.query.count()
    active_bookings = Booking.query.filter(
        Booking.booking_status.in_(['pending', 'confirmed'])
    ).count()
    current_stays = (
        Stay.query.join(Booking)
        .filter(
            Booking.booking_status == 'checked_in',
            Stay.stay_status.in_(['active', 'checkout_requested', 'checkout_approved'])
        )
        .count()
    )
    today_checkins = get_daily_checkins(None)
    occupancy_rate = get_occupancy_rate(None)
    recent_logs = AuditLog.query.order_by(AuditLog.id.desc()).limit(8).all()
    recent_activity = [
        {
            'guest_name': log.description,
            'action': log.action_type.replace('_', ' ').title(),
            'time': log.timestamp,
            'status': 'Completed',
            'status_color': 'success',
        }
        for log in recent_logs
    ]
    if not recent_activity:
        checkout_requests = (
            Stay.query.join(Booking)
            .filter(Stay.stay_status == 'checkout_requested')
            .order_by(Stay.updated_at.desc())
            .limit(5)
            .all()
        )
        recent_activity = [
            {
                'guest_name': stay.booking.guest.full_name if stay.booking and stay.booking.guest else 'Guest',
                'action': 'Requested checkout approval',
                'time': stay.updated_at,
                'status': 'Pending',
                'status_color': 'warning',
            }
            for stay in checkout_requests
        ]
    
    # Pass current_user to template
    from flask import session
    user_id = session.get('user_id')
    user = User.query.get(user_id) if user_id else None
    return render_template('admin/dashboard.html', 
                         total_rooms=total_rooms,
                         active_bookings=active_bookings,
                         current_stays=current_stays,
                         today_checkins=today_checkins,
                         occupancy_rate=occupancy_rate,
                         recent_activity=recent_activity,
                         current_user=user)

@admin_bp.route('/settings', methods=['GET', 'POST'])
@admin_required
def settings():
    """Manage Hotel Configuration"""
    import json
    import os
    hotel = HotelSetting.query.first()
    if not hotel:
        # Create default if missing (safety net)
        hotel = HotelSetting(name="New Hotel")
        db.session.add(hotel)
        db.session.commit()

    def _parse_gallery_form(text_value):
        entries = []
        for line in (text_value or '').splitlines():
            line = line.strip()
            if not line:
                continue
            if '|' in line:
                title, url = line.split('|', 1)
                title = title.strip()
                url = url.strip()
            else:
                title, url = '', line
            if not url:
                continue
            entries.append({
                'title': title or os.path.basename(url).rsplit('.', 1)[0].replace('-', ' ').title(),
                'url': url
            })
        return entries
    
    if request.method == 'POST':
        hotel.name = request.form.get('name')
        hotel.description = request.form.get('description')
        hotel.address = request.form.get('address')
        hotel.phone = request.form.get('phone')
        hotel.email = request.form.get('email')
        hotel.check_in_time = request.form.get('check_in_time')
        hotel.check_out_time = request.form.get('check_out_time')
        hotel.policy_cancellation = request.form.get('policy_cancellation')

        gallery_entries = _parse_gallery_form(request.form.get('gallery_images'))

        gallery_uploads = request.files.getlist('gallery_uploads')
        if gallery_uploads:
            from flask import current_app
            from utils.file_handler import save_uploaded_file
            for file in gallery_uploads:
                if not file or file.filename == '':
                    continue
                filepath, error = save_uploaded_file(
                    file,
                    current_app.config['UPLOAD_FOLDER'],
                    current_app.config['ALLOWED_EXTENSIONS']
                )
                if filepath:
                    filename = os.path.basename(filepath)
                    title = os.path.splitext(filename)[0].replace('_', ' ').replace('-', ' ').title()
                    gallery_entries.append({
                        'title': title,
                        'url': f"/static/uploads/{filename}"
                    })
                elif error:
                    flash(f'Gallery upload error: {error}', 'warning')

        hotel.gallery_images = json.dumps(gallery_entries) if gallery_entries else None
        
        db.session.commit()
        flash('Hotel settings updated successfully!', 'success')
        return redirect(url_for('admin.settings'))
        
    return render_template(
        'admin/settings.html',
        hotel=hotel,
        gallery_images=hotel.get_gallery_images()
    )

# User Management
@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    """Get all users"""
    try:
        role = request.args.get('role')
        query = User.query
        
        if role:
            query = query.filter_by(role=role)
        
        users = query.all()
        return jsonify([user.to_dict() for user in users]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    """Create a new user (staff)"""
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password') or not data.get('role'):
            return jsonify({'error': 'Email, password, and role are required'}), 400
        
        if data['role'] not in ['Admin', 'Receptionist']:
            return jsonify({'error': 'Invalid role. Must be Admin or Receptionist'}), 400

        password_ok, password_error = validate_password_strength(data['password'])
        if not password_ok:
            return jsonify({'error': password_error}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        user = User(email=data['email'], role=data['role'])
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({'message': 'User created successfully', 'user': user.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Update user"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        if 'email' in data:
            existing = User.query.filter_by(email=data['email']).first()
            if existing and existing.id != user_id:
                return jsonify({'error': 'Email already exists'}), 400
            user.email = data['email']
        
        if 'is_active' in data:
            user.is_active = data['is_active']
        
        if 'password' in data and data['password']:
            password_ok, password_error = validate_password_strength(data['password'])
            if not password_ok:
                return jsonify({'error': password_error}), 400
            user.set_password(data['password'])
        
        db.session.commit()
        return jsonify({'message': 'User updated successfully', 'user': user.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete user"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Prevent deleting yourself
        current_user_id = get_jwt_identity()
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/room-types/manage', methods=['GET', 'POST'])
@admin_required
def manage_room_types():
    """UI for Managing Room Types"""
    if request.method == 'POST':
        # Handle Updates (Simpler form handling for now)
        try:
            type_id = request.form.get('id')
            room_type = RoomType.query.get(type_id)
            if room_type:
                room_type.name = request.form.get('name')
                room_type.base_price = float(request.form.get('base_price'))
                room_type.description = request.form.get('description')
                room_type.amenities = request.form.get('amenities')
                room_type.category = request.form.get('category', 'Standard')
                
                # Image Upload Logic
                if 'image' in request.files:
                    file = request.files['image']
                    if file and file.filename != '':
                        from flask import current_app
                        from utils.file_handler import save_uploaded_file
                        
                        filepath, error = save_uploaded_file(
                            file, 
                            current_app.config['UPLOAD_FOLDER'], 
                            current_app.config['ALLOWED_EXTENSIONS']
                        )
                        
                        if filepath:
                            # Convert absolute path to relative path for URL usage
                            # Assuming uploads go to static/uploads, we want the path relative to static
                            filename = os.path.basename(filepath)
                            room_type.image_path = f"/static/uploads/{filename}"
                        elif error:
                            flash(f'Error uploading image: {error}', 'warning')
                
                db.session.commit()
                flash('Room updated successfully!', 'success')
            return redirect(url_for('admin.manage_room_types'))
        except Exception as e:
            flash(f'Error updating room: {str(e)}', 'error')
            
    room_types = RoomType.query.all()
    return render_template('admin/manage_rooms.html', room_types=room_types)

@admin_bp.route('/room-types/manage/new', methods=['GET', 'POST'])
@admin_bp.route('/room-types/manage/<int:type_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_room_type(type_id=None):
    """Dedicated page for creating or editing a room type."""
    from flask import session, current_app

    room_type = RoomType.query.get(type_id) if type_id else None
    is_new = room_type is None

    if request.method == 'POST':
        try:
            if is_new:
                room_type = RoomType()
                db.session.add(room_type)

            room_type.name = request.form.get('name')
            room_type.capacity = int(request.form.get('capacity') or 1)
            room_type.base_price = float(request.form.get('base_price') or 0)
            room_type.description = request.form.get('description')
            room_type.amenities = request.form.get('amenities')
            room_type.category = request.form.get('category', 'Standard')
            room_type.is_active = request.form.get('is_active', '1') == '1'

            if 'image' in request.files:
                file = request.files['image']
                if file and file.filename != '':
                    from utils.file_handler import save_uploaded_file

                    filepath, error = save_uploaded_file(
                        file,
                        current_app.config['UPLOAD_FOLDER'],
                        current_app.config['ALLOWED_EXTENSIONS']
                    )

                    if filepath:
                        filename = os.path.basename(filepath)
                        room_type.image_path = f"/static/uploads/{filename}"
                    elif error:
                        flash(f'Error uploading image: {error}', 'warning')

            db.session.commit()
            flash(
                'Room type created successfully!' if is_new else 'Room type updated successfully!',
                'success'
            )
            return redirect(url_for('admin.manage_room_types'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error saving room type: {str(e)}', 'error')

    user_id = session.get('user_id')
    user = User.query.get(user_id) if user_id else None
    return render_template(
        'admin/edit_room_type.html',
        room_type=room_type,
        is_new=is_new,
        current_user=user
    )

# JSON API (Keep existing for potential JS calls)
@admin_bp.route('/room-types', methods=['GET'])
@admin_required
def get_room_types():
    """Get all room types"""
    try:
        room_types = RoomType.query.all()
        return jsonify([rt.to_dict() for rt in room_types]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/room-types', methods=['POST'])
@admin_required
def create_room_type():
    """Create new room type"""
    try:
        data = request.get_json()
        
        required_fields = ['name', 'capacity', 'base_price']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        if RoomType.query.filter_by(name=data['name']).first():
            return jsonify({'error': 'Room type name already exists'}), 400
        
        room_type = RoomType(
            name=data['name'],
            capacity=data['capacity'],
            base_price=data['base_price'],
            description=data.get('description'),
            amenities=data.get('amenities'),
            category=data.get('category', 'Standard')
        )
        
        db.session.add(room_type)
        db.session.commit()
        
        return jsonify({'message': 'Room type created successfully', 'room_type': room_type.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/room-types/<int:room_type_id>', methods=['PUT'])
@admin_required
def update_room_type(room_type_id):
    """Update room type"""
    try:
        room_type = RoomType.query.get(room_type_id)
        if not room_type:
            return jsonify({'error': 'Room type not found'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            existing = RoomType.query.filter_by(name=data['name']).first()
            if existing and existing.id != room_type_id:
                return jsonify({'error': 'Room type name already exists'}), 400
            room_type.name = data['name']
        
        if 'capacity' in data:
            room_type.capacity = data['capacity']
        if 'base_price' in data:
            room_type.base_price = data['base_price']
        if 'description' in data:
            room_type.description = data['description']
        if 'amenities' in data:
            room_type.amenities = data['amenities']
        if 'category' in data:
            room_type.category = data['category']
        if 'is_active' in data:
            room_type.is_active = data['is_active']
        
        db.session.commit()
        return jsonify({'message': 'Room type updated successfully', 'room_type': room_type.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Room Management
@admin_bp.route('/rooms', methods=['GET'])
@admin_required
def get_rooms():
    """Get all rooms"""
    try:
        rooms = Room.query.all()
        return jsonify([room.to_dict() for room in rooms]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/rooms', methods=['POST'])
@admin_required
def create_room():
    """Create new room"""
    try:
        data = request.get_json()
        
        required_fields = ['room_number', 'room_type_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        if Room.query.filter_by(room_number=data['room_number']).first():
            return jsonify({'error': 'Room number already exists'}), 400
        
        room = Room(
            room_number=data['room_number'],
            room_type_id=data['room_type_id'],
            floor=data.get('floor'),
            status=data.get('status', 'available')
        )
        
        db.session.add(room)
        db.session.commit()
        
        return jsonify({'message': 'Room created successfully', 'room': room.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/rooms/<int:room_id>', methods=['PUT'])
@admin_required
def update_room(room_id):
    """Update room"""
    try:
        from services.booking_service import _clear_auto_cleaning_marker
        room = Room.query.get(room_id)
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        
        data = request.get_json()
        
        if 'room_number' in data:
            existing = Room.query.filter_by(room_number=data['room_number']).first()
            if existing and existing.id != room_id:
                return jsonify({'error': 'Room number already exists'}), 400
            room.room_number = data['room_number']
        
        if 'room_type_id' in data:
            room.room_type_id = data['room_type_id']
        if 'floor' in data:
            room.floor = data['floor']
        if 'status' in data:
            room.status = data['status']
            if data['status'] != 'cleaning':
                _clear_auto_cleaning_marker(room)
        if 'is_active' in data:
            room.is_active = data['is_active']
        
        db.session.commit()
        return jsonify({'message': 'Room updated successfully', 'room': room.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Service Management
@admin_bp.route('/services', methods=['GET'])
@admin_required
def get_services():
    """Get all services"""
    try:
        services = Service.query.all()
        return jsonify([s.to_dict() for s in services]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/services', methods=['POST'])
@admin_required
def create_service():
    """Create new service"""
    try:
        data = request.get_json()
        
        required_fields = ['name', 'price']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        category = (data.get('category') or '').strip().lower()
        if category == 'vehicles':
            category = 'vehicle'
        if category == 'liquors':
            category = 'liquor'

        service = Service(
            name=data['name'],
            price=data['price'],
            description=data.get('description'),
            category=category or data.get('category'),
            subcategory=data.get('subcategory'),
            option_variant=data.get('option_variant'),
            size_category=data.get('size_category')
        )
        
        db.session.add(service)
        db.session.commit()
        
        return jsonify({'message': 'Service created successfully', 'service': service.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/services/<int:service_id>', methods=['PUT'])
@admin_required
def update_service(service_id):
    """Update service"""
    try:
        service = Service.query.get(service_id)
        if not service:
            return jsonify({'error': 'Service not found'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            service.name = data['name']
        if 'price' in data:
            service.price = data['price']
        if 'description' in data:
            service.description = data['description']
        if 'category' in data:
            category = (data.get('category') or '').strip().lower()
            if category == 'vehicles':
                category = 'vehicle'
            if category == 'liquors':
                category = 'liquor'
            service.category = category
        if 'subcategory' in data:
            service.subcategory = data['subcategory']
        if 'option_variant' in data:
            service.option_variant = data['option_variant']
        if 'size_category' in data:
            service.size_category = data['size_category']
        if 'is_active' in data:
            service.is_active = data['is_active']
        
        db.session.commit()
        return jsonify({'message': 'Service updated successfully', 'service': service.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Reports
@admin_bp.route('/reports/daily-checkins', methods=['GET'])
@admin_required
def daily_checkins():
    """Get daily check-ins"""
    try:
        date_str = request.args.get('date')
        date = parse_date(date_str) if date_str else None
        
        checkins = get_daily_checkins(date)
        return jsonify(checkins), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/reports/daily-checkouts', methods=['GET'])
@admin_required
def daily_checkouts():
    """Get daily check-outs"""
    try:
        date_str = request.args.get('date')
        date = parse_date(date_str) if date_str else None
        
        checkouts = get_daily_checkouts(date)
        return jsonify(checkouts), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/reports/occupancy', methods=['GET'])
@admin_required
def occupancy_report():
    """Get occupancy rate"""
    try:
        date_str = request.args.get('date')
        date = parse_date(date_str) if date_str else None
        
        occupancy = get_occupancy_rate(date)
        return jsonify({'occupancy_rate': occupancy}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/reports/revenue', methods=['GET'])
@admin_required
def revenue_report():
    """Get revenue summary"""
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        start_date = parse_date(start_date_str) if start_date_str else None
        end_date = parse_date(end_date_str) if end_date_str else None
        
        revenue = get_revenue_summary(start_date, end_date)
        return jsonify(revenue), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/reports/room-utilization', methods=['GET'])
@admin_required
def room_utilization_report():
    """Get room utilization"""
    try:
        utilization = get_room_utilization()
        return jsonify(utilization), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
