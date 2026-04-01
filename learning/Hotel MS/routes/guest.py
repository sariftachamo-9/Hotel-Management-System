from datetime import date, datetime

from flask import Blueprint, flash, jsonify, redirect, render_template, request, url_for
from sqlalchemy import desc, or_

from auth.decorators import get_current_user_id, login_required
from models import Booking, Guest, Invoice, Room, RoomType, Service, ServiceUsage, Stay, SupportTicket, User, db
from services.billing_service import add_service_to_stay, calculate_total_bill
from services.booking_service import check_room_availability, sync_room_status
from services.checkout_service import perform_checkout
from services.pricing_service import PricingService
from utils.security import validate_password_strength


guest_bp = Blueprint("guest", __name__, url_prefix="/guest")
ACTIVE_STAY_STATUSES = ("active", "checkout_requested", "checkout_approved")


def _get_current_user():
    user_id = get_current_user_id()
    return User.query.get(user_id) if user_id else None


def _get_current_guest():
    user = _get_current_user()
    return user.guest if user and user.guest else None


def _ensure_guest_or_redirect(next_endpoint="guest.dashboard", **next_values):
    guest = _get_current_guest()
    if guest:
        return guest, None
    return None, redirect(url_for("guest.create_profile", next=url_for(next_endpoint, **next_values)))


def _booking_belongs_to_current_guest(booking_id):
    guest = _get_current_guest()
    if not guest:
        return None
    return Booking.query.filter_by(id=booking_id, guest_id=guest.id).first()


def _is_room_available(room, check_in, check_out):
    is_available, _ = check_room_availability(room.id, check_in, check_out)
    return is_available


def _build_available_counts(room_types, check_in=None, check_out=None):
    available_counts = {}
    for room_type in room_types:
        rooms = Room.query.filter_by(room_type_id=room_type.id, is_active=True).all()
        if check_in is None or check_out is None:
            available_counts[room_type.id] = sum(
                1 for room in rooms if sync_room_status(room).status == "available"
            )
        else:
            available_counts[room_type.id] = sum(
                1 for room in rooms if _is_room_available(room, check_in, check_out)
            )
    return available_counts


def _room_type_image_url(room_type):
    """Return a browser-safe image URL for a room type, with fallback."""
    fallback = "https://images.unsplash.com/photo-1631049307204-42a792e24d32?q=80&w=1200&auto=format&fit=crop"
    raw_path = (room_type.image_path or "").strip() if room_type else ""
    if not raw_path:
        return fallback

    normalized = raw_path.replace("\\", "/")
    lowered = normalized.lower()

    if normalized.startswith(("http://", "https://", "//")):
        return normalized

    static_idx = lowered.find("/static/")
    if static_idx != -1:
        return normalized[static_idx:]

    if lowered.startswith("static/"):
        return f"/{normalized}"
    if lowered.startswith("/uploads/"):
        return f"/static{normalized}"
    if lowered.startswith("uploads/"):
        return f"/static/{normalized}"

    filename = normalized.split("/")[-1]
    return f"/static/uploads/{filename}"


def _room_type_image_map(room_types):
    return {room_type.id: _room_type_image_url(room_type) for room_type in room_types}


def _get_billable_stays_for_guest(guest_id):
    return (
        Stay.query.join(Booking)
        .filter(Booking.guest_id == guest_id)
        .filter(
            or_(
                Booking.booking_status.in_(["checked_in", "checked_out"]),
                Stay.stay_status.in_(ACTIVE_STAY_STATUSES + ("completed",)),
            )
        )
        .order_by(desc(Stay.created_at))
        .all()
    )


def _build_invoice_summary(stay):
    invoice = stay.invoice
    if invoice:
        return {
            "invoice_id": invoice.id,
            "stay_id": stay.id,
            "invoice_number": invoice.invoice_number,
            "total_amount": invoice.total_amount,
            "amount_paid": invoice.amount_paid,
            "balance": invoice.balance,
            "generated_at": invoice.generated_at,
            "room_charges": invoice.room_charges,
            "service_charges": invoice.service_charges,
            "tax_amount": invoice.tax_amount,
            "discount": invoice.discount,
            "notes": invoice.notes,
            "is_estimate": False,
        }

    bill = calculate_total_bill(stay)
    amount_paid = sum(payment.amount for payment in stay.payments)
    return {
        "invoice_id": None,
        "stay_id": stay.id,
        "invoice_number": f"PENDING-{stay.id}",
        "total_amount": bill["total_amount"],
        "amount_paid": amount_paid,
        "balance": round(bill["total_amount"] - amount_paid, 2),
        "generated_at": stay.updated_at or stay.created_at,
        "room_charges": bill["room_charges"],
        "service_charges": bill["service_charges"],
        "tax_amount": bill["tax_amount"],
        "discount": bill["discount"],
        "notes": stay.notes,
        "nights": bill["nights"],
        "is_estimate": True,
    }


def _get_active_stay_for_guest(guest_id):
    return (
        Stay.query.join(Booking)
        .filter(Booking.guest_id == guest_id, Booking.booking_status == "checked_in")
        .filter(Stay.stay_status.in_(ACTIVE_STAY_STATUSES))
        .order_by(desc(Stay.actual_check_in))
        .first()
    )


@guest_bp.route("/booking/<int:booking_id>/request_checkout", methods=["POST"])
@login_required
def request_checkout(booking_id):
    booking = _booking_belongs_to_current_guest(booking_id)
    if not booking:
        flash("Unauthorized or booking not found.", "danger")
        return redirect(url_for("guest.dashboard"))
    if not booking.stay:
        flash("You can only request checkout for an active stay.", "warning")
        return redirect(url_for("guest.dashboard"))
    if booking.stay.stay_status == "checkout_requested":
        flash("Your checkout request is already pending admin approval.", "info")
        return redirect(url_for("guest.dashboard"))
    if booking.stay.stay_status == "checkout_approved":
        flash("Your checkout has already been approved by admin.", "success")
        return redirect(url_for("guest.dashboard"))
    if booking.stay.stay_status != "active":
        flash("You can only request checkout for an active stay.", "warning")
        return redirect(url_for("guest.dashboard"))

    note = f"[Checkout Requested by Guest at {datetime.utcnow():%Y-%m-%d %H:%M:%S}]"
    booking.stay.notes = f"{booking.stay.notes}\n{note}".strip() if booking.stay.notes else note
    booking.stay.stay_status = "checkout_requested"
    admin_ticket = SupportTicket(
        user_id=booking.guest.user_id,
        subject=f"Checkout Request: Booking #{booking.id}",
        message=(
            f"Guest {booking.guest.full_name} requested checkout approval for room "
            f"{booking.room.room_number if booking.room else booking.room_id}."
        ),
        status="open",
    )
    db.session.add(admin_ticket)
    db.session.commit()
    flash("Checkout request sent to admin. Please wait for approval.", "info")
    return redirect(url_for("guest.dashboard"))


@guest_bp.route("/booking/<int:booking_id>/checkout", methods=["POST"])
@login_required
def guest_checkout(booking_id):
    booking = _booking_belongs_to_current_guest(booking_id)
    if not booking:
        flash("Unauthorized or booking not found.", "danger")
        return redirect(url_for("guest.dashboard"))
    if not booking.stay or booking.stay.stay_status != "checkout_approved":
        flash("Checkout not approved by admin yet.", "warning")
        return redirect(url_for("guest.dashboard"))

    invoice, error = perform_checkout(booking.stay.id, user_id=_get_current_user().id)
    if error:
        flash(f"Checkout failed: {error}", "danger")
        return redirect(url_for("guest.dashboard"))

    flash(
        f"Checked out successfully! {'Invoice generated.' if invoice else ''}".strip(),
        "success",
    )
    return redirect(url_for("guest.dashboard"))


@guest_bp.route("/booking/<int:booking_id>/cancel", methods=["POST"])
@login_required
def cancel_booking(booking_id):
    booking = _booking_belongs_to_current_guest(booking_id)
    if not booking:
        flash("Unauthorized or booking not found.", "danger")
        return redirect(url_for("guest.dashboard"))
    if booking.booking_status not in ["pending", "confirmed"]:
        flash("Cannot cancel this booking.", "warning")
        return redirect(url_for("guest.dashboard"))

    booking.booking_status = "cancelled"
    if booking.room:
        sync_room_status(booking.room)
    db.session.commit()
    flash("Booking cancelled successfully.", "success")
    return redirect(url_for("guest.dashboard"))


@guest_bp.route("/booking/<int:booking_id>/details", methods=["GET"])
@login_required
def booking_details(booking_id):
    booking = _booking_belongs_to_current_guest(booking_id)
    if not booking:
        flash("Unauthorized or booking not found.", "danger")
        return redirect(url_for("guest.dashboard"))
    return render_template("guest/booking_detail.html", booking=booking)


@guest_bp.route("/booking/<int:booking_id>/checkin", methods=["POST"])
@login_required
def checkin_booking(booking_id):
    booking = _booking_belongs_to_current_guest(booking_id)
    if not booking:
        flash("Unauthorized or booking not found.", "danger")
        return redirect(url_for("guest.dashboard"))
    if booking.booking_status != "confirmed":
        flash("Only confirmed bookings can be checked in.", "warning")
        return redirect(url_for("guest.dashboard"))

    today = datetime.utcnow().date()
    if today > booking.check_out_date:
        flash("Check-in not allowed: your booking has already ended. Please extend your booking first.", "danger")
        return redirect(url_for("guest.extend_booking", booking_id=booking.id))

    booking.booking_status = "checked_in"
    if not booking.stay:
        stay = Stay(booking_id=booking.id, actual_check_in=datetime.utcnow(), stay_status="active")
        db.session.add(stay)
        db.session.flush()  # get stay.id
    else:
        stay = booking.stay
        if not stay.actual_check_in:
            stay.actual_check_in = datetime.utcnow()
        stay.stay_status = "active"
    if booking.room:
        booking.room.status = "occupied"
    db.session.commit()
    flash("Checked in successfully!", "success")
    return redirect(url_for("guest.dashboard"))


@guest_bp.route("/booking/<int:booking_id>/extend", methods=["GET", "POST"])
@login_required
def extend_booking(booking_id):
    booking = _booking_belongs_to_current_guest(booking_id)
    if not booking:
        flash("Unauthorized or booking not found.", "danger")
        return redirect(url_for("guest.dashboard"))

    if request.method == "POST":
        try:
            new_checkout = datetime.strptime(request.form.get("new_check_out_date", ""), "%Y-%m-%d").date()
        except ValueError:
            flash("Invalid date format.", "danger")
            return redirect(request.url)

        if new_checkout <= booking.check_out_date:
            flash("New check-out date must be after current check-out date.", "warning")
            return redirect(request.url)

        booking.check_out_date = new_checkout
        db.session.commit()
        flash("Booking extended successfully! You can now check in.", "success")
        return redirect(url_for("guest.dashboard"))

    return render_template("guest/extend_booking.html", booking=booking)


@guest_bp.route("/invoices", methods=["GET"])
@login_required
def guest_invoices():
    guest = _get_current_guest()
    if not guest:
        return redirect(url_for("guest.get_profile"))

    invoice_summaries = [_build_invoice_summary(stay) for stay in _get_billable_stays_for_guest(guest.id)]
    return render_template("guest/invoices.html", invoice_summaries=invoice_summaries)


@guest_bp.route("/invoice/<int:invoice_id>", methods=["GET"])
@login_required
def guest_invoice_detail(invoice_id):
    invoice = Invoice.query.get(invoice_id)
    if not invoice:
        flash("Invoice not found.", "danger")
        return redirect(url_for("guest.guest_invoices"))

    guest = _get_current_guest()
    if not guest or not invoice.stay or invoice.stay.booking.guest_id != guest.id:
        flash("Unauthorized invoice access.", "danger")
        return redirect(url_for("guest.guest_invoices"))

    return render_template("guest/invoice_detail.html", invoice=invoice)


@guest_bp.route("/billing/<int:stay_id>", methods=["GET"])
@login_required
def guest_billing_detail(stay_id):
    guest = _get_current_guest()
    stay = Stay.query.get(stay_id)
    if not guest or not stay or stay.booking.guest_id != guest.id:
        flash("Billing summary not found.", "danger")
        return redirect(url_for("guest.guest_invoices"))

    summary = _build_invoice_summary(stay)
    return render_template("guest/invoice_detail.html", invoice=None, summary=summary)


@guest_bp.route("/select-room", methods=["POST"])
@login_required
def select_room():
    room_type_id = request.form.get("room_type_id", type=int)
    check_in_str = request.form.get("check_in", "")
    check_out_str = request.form.get("check_out", "")
    guests = request.form.get("guests", 1, type=int)

    try:
        check_in = datetime.strptime(check_in_str, "%Y-%m-%d").date()
        check_out = datetime.strptime(check_out_str, "%Y-%m-%d").date()
    except ValueError:
        flash("Please provide valid check-in and check-out dates.", "danger")
        return redirect(url_for("guest.new_booking"))

    room_type = RoomType.query.get(room_type_id)
    if not room_type:
        flash("Selected room type was not found.", "danger")
        return redirect(url_for("guest.new_booking"))

    rooms = Room.query.filter_by(room_type_id=room_type_id, is_active=True).all()
    available_rooms = [room for room in rooms if _is_room_available(room, check_in, check_out)]
    nights = max((check_out - check_in).days, 1)
    price = room_type.base_price * nights

    return render_template(
        "guest/select_room.html",
        available_rooms=available_rooms,
        room_type=room_type,
        room_type_image_url=_room_type_image_url(room_type),
        check_in=check_in_str,
        check_out=check_out_str,
        guests=guests,
        price=price,
        nights=nights,
    )


@guest_bp.route("/payment-success")
def booking_success():
    return render_template(
        "guest/booking_success.html",
        check_in=None,
        check_out=None,
        guests=None,
        payment_success=True,
    )


@guest_bp.route("/payment-fail")
def payment_fail():
    return render_template(
        "guest/booking_success.html",
        check_in=None,
        check_out=None,
        guests=None,
        payment_success=False,
    )


@guest_bp.route("/new-booking", methods=["GET", "POST"])
@login_required
def new_booking():
    guest, redirect_response = _ensure_guest_or_redirect("guest.new_booking")
    if redirect_response:
        return redirect_response

    room_types = RoomType.query.all()
    room_type_image_urls = _room_type_image_map(room_types)
    selected_offer = request.args.get("offer")
    check_in_str = request.form.get("check_in") if request.method == "POST" else request.args.get("check_in")
    check_out_str = request.form.get("check_out") if request.method == "POST" else request.args.get("check_out")

    parsed_check_in = None
    parsed_check_out = None
    if check_in_str:
        try:
            parsed_check_in = datetime.strptime(check_in_str, "%Y-%m-%d").date()
            if parsed_check_in < date.today():
                raise ValueError
        except ValueError:
            flash("Check-in date cannot be before today and must use YYYY-MM-DD.", "danger")
            return render_template(
                "guest/new_booking.html",
                room_types=room_types,
                has_profile=bool(guest),
                available_counts=_build_available_counts(room_types),
                room_type_image_urls=room_type_image_urls,
                selected_offer=selected_offer,
            )

    if check_out_str:
        try:
            parsed_check_out = datetime.strptime(check_out_str, "%Y-%m-%d").date()
        except ValueError:
            flash("Invalid check-out date.", "danger")
            return render_template(
                "guest/new_booking.html",
                room_types=room_types,
                has_profile=bool(guest),
                available_counts=_build_available_counts(room_types),
                room_type_image_urls=room_type_image_urls,
                selected_offer=selected_offer,
            )

    if parsed_check_in and parsed_check_out and parsed_check_out <= parsed_check_in:
        flash("Check-out date must be after check-in date.", "danger")
        return render_template(
            "guest/new_booking.html",
            room_types=room_types,
            has_profile=bool(guest),
            available_counts=_build_available_counts(room_types),
            room_type_image_urls=room_type_image_urls,
            selected_offer=selected_offer,
        )

    available_counts = _build_available_counts(room_types, parsed_check_in, parsed_check_out)
    if request.method == "POST":
        return select_room()

    return render_template(
        "guest/new_booking.html",
        room_types=room_types,
        has_profile=bool(guest),
        available_counts=available_counts,
        room_type_image_urls=room_type_image_urls,
        selected_offer=selected_offer,
    )


@guest_bp.route("/profile/setup", methods=["GET", "POST"])
@login_required
def create_profile():
    user = _get_current_user()
    if not user:
        return redirect(url_for("auth.login"))
    if user.guest:
        next_url = request.args.get("next") or request.form.get("next")
        return redirect(next_url or url_for("guest.dashboard"))

    next_url = request.args.get("next") or request.form.get("next")
    if request.method == "POST":
        guest = Guest(
            user_id=user.id,
            full_name=request.form.get("full_name"),
            phone=request.form.get("phone"),
            id_type=request.form.get("id_type"),
            id_number=request.form.get("id_number"),
            email=request.form.get("email"),
            nationality=request.form.get("nationality"),
            emergency_contact=request.form.get("emergency_contact"),
        )
        db.session.add(guest)
        db.session.commit()
        flash("Profile created successfully! You can now book rooms.", "success")
        return redirect(next_url or url_for("guest.dashboard"))

    return render_template("guest/setup_profile.html", next=next_url)


@guest_bp.route("/support", methods=["GET", "POST"])
@login_required
def support_ticket():
    if request.method == "POST":
        user = _get_current_user()
        ticket = SupportTicket(
            user_id=user.id,
            subject=request.form.get("subject") or "Guest Support Request",
            message=request.form.get("message"),
        )
        db.session.add(ticket)
        db.session.commit()
        flash("Your support ticket has been submitted. Our team will contact you soon!", "success")
        return redirect(url_for("guest.support_ticket"))

    return render_template("guest/support_ticket.html")


@guest_bp.route("/dashboard", methods=["GET"])
@login_required
def dashboard():
    user = _get_current_user()
    if not user or not user.guest:
        return redirect(url_for("guest.create_profile"))

    bookings = (
        Booking.query.filter_by(guest_id=user.guest.id)
        .order_by(desc(Booking.created_at))
        .all()
    )
    active_statuses = {"pending", "confirmed", "checked_in"}
    active_bookings = [booking for booking in bookings if booking.booking_status in active_statuses]
    stay_history = [
        booking
        for booking in bookings
        if booking.stay and (
            booking.booking_status in {"checked_in", "checked_out"}
            or booking.stay.stay_status in ACTIVE_STAY_STATUSES + ("completed",)
        )
    ]
    return render_template(
        "guest/dashboard.html",
        guest=user.guest,
        active_bookings=active_bookings,
        stay_history=stay_history,
    )


@guest_bp.route("/profile", methods=["GET"])
@login_required
def get_profile():
    user = _get_current_user()
    if not user or not user.guest:
        return render_template("guest/setup_profile.html")
    return render_template("guest/profile.html", guest=user.guest, user=user)


@guest_bp.route("/profile/change-password", methods=["POST"])
@login_required
def change_password():
    user = _get_current_user()
    if not user:
        return redirect(url_for("auth.login"))

    current_password = request.form.get("current_password", "")
    new_password = request.form.get("new_password", "")
    confirm_password = request.form.get("confirm_password", "")

    if not user.check_password(current_password):
        flash("Current password is incorrect.", "danger")
        return redirect(url_for("guest.get_profile"))
    password_ok, password_error = validate_password_strength(new_password)
    if not password_ok:
        flash(password_error, "warning")
        return redirect(url_for("guest.get_profile"))
    if new_password != confirm_password:
        flash("New password and confirmation do not match.", "warning")
        return redirect(url_for("guest.get_profile"))

    user.set_password(new_password)
    db.session.commit()
    flash("Password updated successfully.", "success")
    return redirect(url_for("guest.get_profile"))


@guest_bp.route("/current-stay", methods=["GET"])
@login_required
def current_stay():
    guest = _get_current_guest()
    if not guest:
        return redirect(url_for("guest.get_profile"))

    stay = _get_active_stay_for_guest(guest.id)
    services = Service.query.filter_by(is_active=True).order_by(Service.category.asc(), Service.name.asc()).all()
    food_services = [s for s in services if (s.category or "").lower() == "food"]
    vehicle_services = [s for s in services if (s.category or "").lower() == "vehicle"]
    liquor_services = [s for s in services if (s.category or "").lower() == "liquor"]
    billing_summary = _build_invoice_summary(stay) if stay else None
    return render_template(
        "guest/current_stay.html",
        stay=stay,
        billing_summary=billing_summary,
        food_services=food_services,
        vehicle_services=vehicle_services,
        liquor_services=liquor_services,
    )


@guest_bp.route("/order-food", methods=["GET"])
@login_required
def order_food_page():
    guest = _get_current_guest()
    if not guest:
        return redirect(url_for("guest.get_profile"))

    stay = _get_active_stay_for_guest(guest.id)
    if not stay:
        flash("You should be checked in first to order food, vehicles, and liquors.", "danger")
        return redirect(url_for("guest.dashboard"))

    food_services = (
        Service.query.filter_by(is_active=True, category="food")
        .order_by(Service.name.asc())
        .all()
    )
    return render_template(
        "guest/order_services.html",
        title="Order Food",
        mode="food",
        stay=stay,
        services=food_services,
    )


@guest_bp.route("/order-vehicles", methods=["GET"])
@login_required
def order_vehicle_page():
    guest = _get_current_guest()
    if not guest:
        return redirect(url_for("guest.get_profile"))

    stay = _get_active_stay_for_guest(guest.id)
    if not stay:
        flash("You should be checked in first to order food, vehicles, and liquors.", "danger")
        return redirect(url_for("guest.dashboard"))

    vehicle_services = (
        Service.query.filter_by(is_active=True, category="vehicle")
        .order_by(Service.name.asc())
        .all()
    )
    return render_template(
        "guest/order_services.html",
        title="Vehicle Services",
        mode="vehicle",
        stay=stay,
        services=vehicle_services,
    )


@guest_bp.route("/order-liquors", methods=["GET"])
@login_required
def order_liquor_page():
    guest = _get_current_guest()
    if not guest:
        return redirect(url_for("guest.get_profile"))

    stay = _get_active_stay_for_guest(guest.id)
    if not stay:
        flash("You should be checked in first to order food, vehicles, and liquors.", "danger")
        return redirect(url_for("guest.dashboard"))

    liquor_services = (
        Service.query.filter_by(is_active=True, category="liquor")
        .order_by(Service.name.asc())
        .all()
    )
    return render_template(
        "guest/order_services.html",
        title="Liquor Services",
        mode="liquor",
        stay=stay,
        services=liquor_services,
    )


@guest_bp.route("/current-stay/order-service", methods=["POST"])
@login_required
def order_service_for_stay():
    guest = _get_current_guest()
    if not guest:
        return redirect(url_for("guest.get_profile"))

    stay = _get_active_stay_for_guest(guest.id)
    if not stay:
        flash("You should be checked in first to order food, vehicles, and liquors.", "danger")
        return redirect(url_for("guest.dashboard"))

    service_id = request.form.get("service_id", type=int)
    quantity = request.form.get("quantity", type=int, default=1)
    notes = request.form.get("notes")

    if not service_id:
        flash("Please select a service option.", "warning")
        return redirect(url_for("guest.current_stay"))

    if not quantity or quantity < 1:
        flash("Quantity must be at least 1.", "warning")
        return redirect(url_for("guest.current_stay"))

    expected_category = (request.form.get("expected_category") or "").strip().lower()
    if expected_category == "vehicles":
        expected_category = "vehicle"
    if expected_category == "liquors":
        expected_category = "liquor"
    service = Service.query.get(service_id)
    if not service or not service.is_active:
        flash("Selected service is not available.", "danger")
        return redirect(url_for("guest.current_stay"))
    if expected_category and (service.category or "").lower() != expected_category:
        flash("Please select a valid service from the selected category.", "warning")
        return redirect(url_for("guest.current_stay"))

    service_usage, error = add_service_to_stay(stay.id, service_id, quantity=quantity, notes=notes)
    if error:
        flash(f"Could not add service: {error}", "danger")
    else:
        service_name = service_usage.service.name if service_usage and service_usage.service else "Service"
        guest_name = guest.full_name if guest.full_name else (_get_current_user().email if _get_current_user() else "Guest")
        room_number = stay.booking.room.room_number if stay.booking and stay.booking.room else "N/A"
        admin_ticket = SupportTicket(
            user_id=guest.user_id,
            subject=f"Order Sent: {service_name}",
            message=(
                f"Order #{service_usage.id} sent by {guest_name} "
                f"(Room {room_number}) - {service_name} x{service_usage.quantity}."
                + (f" Notes: {notes}" if notes else "")
            ),
            status="open",
        )
        db.session.add(admin_ticket)
        db.session.commit()
        flash(f"{service_name} added to your bill successfully.", "success")

    return redirect(url_for("guest.current_stay"))


@guest_bp.route("/current-stay/edit-service/<int:usage_id>", methods=["POST"])
@login_required
def edit_service_for_stay(usage_id):
    guest = _get_current_guest()
    if not guest:
        return redirect(url_for("guest.get_profile"))

    stay = _get_active_stay_for_guest(guest.id)
    if not stay:
        flash("You should be checked in first to manage orders.", "danger")
        return redirect(url_for("guest.dashboard"))

    usage = ServiceUsage.query.get(usage_id)
    if not usage or usage.stay_id != stay.id:
        flash("Order item not found for your stay.", "warning")
        return redirect(url_for("guest.current_stay"))

    if (usage.order_status or "").lower() == "received":
        flash("Order already received by admin. You can no longer edit it.", "warning")
        return redirect(url_for("guest.current_stay"))

    quantity = request.form.get("quantity", type=int, default=usage.quantity)
    notes = request.form.get("notes")
    service_id = request.form.get("service_id", type=int, default=usage.service_id)

    service = Service.query.get(service_id)
    if not service or not service.is_active:
        flash("Selected service is not available.", "warning")
        return redirect(url_for("guest.current_stay"))

    if quantity < 1:
        flash("Quantity must be at least 1.", "warning")
        return redirect(url_for("guest.current_stay"))

    usage.service_id = service.id
    usage.quantity = quantity
    usage.notes = notes
    usage.total_price = round(service.price * quantity, 2)
    usage.order_status = "sent"
    usage.received_at = None
    usage.received_by = None
    guest_name = guest.full_name if guest.full_name else (_get_current_user().email if _get_current_user() else "Guest")
    room_number = stay.booking.room.room_number if stay.booking and stay.booking.room else "N/A"
    updated_service_name = usage.service.name if usage.service else "Service"
    admin_ticket = SupportTicket(
        user_id=guest.user_id,
        subject=f"Order Updated: {updated_service_name}",
        message=(
            f"Order #{usage.id} updated by {guest_name} "
            f"(Room {room_number}) - {updated_service_name} x{usage.quantity}."
            + (f" Notes: {usage.notes}" if usage.notes else "")
        ),
        status="open",
    )
    db.session.add(admin_ticket)
    db.session.commit()

    flash("Order updated successfully and marked as sent.", "success")
    return redirect(url_for("guest.current_stay"))


@guest_bp.route("/current-stay/remove-service/<int:usage_id>", methods=["POST"])
@login_required
def remove_service_for_stay(usage_id):
    guest = _get_current_guest()
    if not guest:
        return redirect(url_for("guest.get_profile"))

    stay = _get_active_stay_for_guest(guest.id)
    if not stay:
        flash("You should be checked in first to manage food and vehicle orders.", "danger")
        return redirect(url_for("guest.dashboard"))

    usage = ServiceUsage.query.get(usage_id)
    if not usage or usage.stay_id != stay.id:
        flash("Service item not found for your current stay.", "warning")
        return redirect(url_for("guest.current_stay"))

    if (usage.order_status or "").lower() == "received":
        flash("Order already received by admin. You can no longer remove it.", "warning")
        return redirect(url_for("guest.current_stay"))

    removed_name = usage.service.name if usage.service else "Service"
    try:
        db.session.delete(usage)
        db.session.commit()
        flash(f"{removed_name} removed from your bill.", "success")
    except Exception as e:
        db.session.rollback()
        flash(f"Could not remove service: {str(e)}", "danger")

    return redirect(url_for("guest.current_stay"))


@guest_bp.route("/api/guest/book", methods=["POST"])
@login_required
def api_book_room():
    data = request.get_json() or {}
    room_type_id = data.get("room_type_id")
    check_in = data.get("check_in")
    check_out = data.get("check_out")
    promo_code = data.get("promo")
    if not all([room_type_id, check_in, check_out]):
        return jsonify({"error": "Missing booking parameters"}), 400

    room_type = RoomType.query.get(room_type_id)
    if not room_type:
        return jsonify({"error": "Invalid room type"}), 400

    price_details = PricingService.calculate_price(room_type.base_price, check_in, check_out, promo_code)
    return jsonify({"success": True, "price": price_details})


@guest_bp.route("/profile/edit", methods=["GET", "POST"])
@login_required
def edit_profile():
    guest = _get_current_guest()
    if not guest:
        return redirect(url_for("guest.get_profile"))

    if request.method == "POST":
        guest.full_name = request.form.get("full_name")
        guest.phone = request.form.get("phone")
        guest.emergency_contact = request.form.get("emergency_contact")
        db.session.commit()
        flash("Profile updated successfully!", "success")
        return redirect(url_for("guest.get_profile"))

    return render_template("guest/edit_profile.html", guest=guest)


@guest_bp.route("/book", methods=["GET", "POST"])
@login_required
def book_room():
    user = _get_current_user()
    if not user:
        return redirect(url_for("auth.login"))
    if not user.guest:
        next_url = request.full_path[:-1] if request.full_path.endswith("?") else request.full_path
        return redirect(url_for("guest.create_profile", next=next_url))

    if request.method == "GET":
        room_type_id = request.args.get("room_type_id", type=int)
        check_in = request.args.get("check_in")
        check_out = request.args.get("check_out")
        guests = request.args.get("guests", type=int, default=1)
        promo_code = request.args.get("promo")
        selected_offer = request.args.get("offer")

        if selected_offer and not all([room_type_id, check_in, check_out]):
            room_types = RoomType.query.all()
            return render_template(
                "guest/new_booking.html",
                room_types=room_types,
                has_profile=True,
                available_counts=_build_available_counts(room_types),
                room_type_image_urls=_room_type_image_map(room_types),
                selected_offer=selected_offer,
            )

        if not all([room_type_id, check_in, check_out]):
            return render_template("errors/404.html", error="Missing booking parameters."), 400

        room_type = RoomType.query.get(room_type_id)
        if not room_type:
            return render_template("errors/404.html", error="Room type not found."), 404

        price_details = PricingService.calculate_price(room_type.base_price, check_in, check_out, promo_code)
        return render_template(
            "guest/booking_confirm.html",
            room_type=room_type,
            room_type_image_url=_room_type_image_url(room_type),
            price=price_details,
            check_in=check_in,
            check_out=check_out,
            guests=guests,
            promo=promo_code,
            current_user=user,
        )

    room_type_id = request.form.get("room_type_id", type=int)
    selected_room_id = request.form.get("room_id", type=int)
    check_in = request.form.get("check_in")
    check_out = request.form.get("check_out")
    guests = request.form.get("guests", type=int, default=1)
    promo = request.form.get("promo")

    try:
        check_in_date = datetime.strptime(check_in, "%Y-%m-%d").date()
        check_out_date = datetime.strptime(check_out, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        flash("Please provide valid booking dates.", "danger")
        return redirect(url_for("guest.new_booking"))

    if check_out_date <= check_in_date:
        flash("Check-out date must be after check-in date.", "danger")
        return redirect(url_for("guest.new_booking"))

    room_type = RoomType.query.get(room_type_id)
    if not room_type:
        flash("Selected room type was not found.", "danger")
        return redirect(url_for("guest.new_booking"))

    if selected_room_id:
        available_room = Room.query.filter_by(id=selected_room_id, room_type_id=room_type_id, is_active=True).first()
        if not available_room or not _is_room_available(available_room, check_in_date, check_out_date):
            flash("The selected room is no longer available.", "danger")
            return redirect(url_for("guest.new_booking"))
    else:
        available_room = next(
            (
                room
                for room in Room.query.filter_by(room_type_id=room_type_id, is_active=True).all()
                if _is_room_available(room, check_in_date, check_out_date)
            ),
            None,
        )
        if not available_room:
            return render_template("errors/404.html", error="No available room for selected dates."), 400

    booking = Booking(
        guest_id=user.guest.id,
        room_id=available_room.id,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        num_guests=guests,
        booking_status="confirmed",
        booking_type="advance",
        created_by=user.id,
    )
    db.session.add(booking)
    available_room.status = "reserved"
    db.session.commit()

    return render_template(
        "guest/booking_success.html",
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        payment_success=True,
    )
