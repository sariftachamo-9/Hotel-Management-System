from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from .user import User
from .guest import Guest
from .room import Room, RoomType
from .booking import Booking
from .stay import Stay
from .service import Service, ServiceUsage
from .payment import Payment
from .invoice import Invoice
from .audit_log import AuditLog
# New models
from .hotel_setting import HotelSetting
from .review import Review
from .pricing import PricingRule, PromoCode
from .support_ticket import SupportTicket
