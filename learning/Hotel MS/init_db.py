from flask import Flask
from config import config
from datetime import datetime
from models import db, User, RoomType, Service, HotelSetting, PricingRule, PromoCode

def init_database():
    """Initialize database with default data"""
    app = Flask(__name__)
    app.config.from_object(config['development'])
    
    db.init_app(app)
    
    with app.app_context():
        # Create all tables
        db.create_all()
        print("- Database tables created")
        
        # Check if admin exists
        admin = User.query.filter_by(email='admin@hotel.com').first()
        if not admin:
            # Create default admin user
            admin = User(
                email='admin@hotel.com',
                role='Admin',
                is_active=True
            )
            admin.set_password('admin123')
            db.session.add(admin)
            print("- Created admin user (admin@hotel.com / admin123)")
        
        # Create default room types
        if RoomType.query.count() == 0:
            room_types = [
                RoomType(
                    name='Standard Single',
                    capacity=1,
                    base_price=2000.0,
                    description='Comfortable single room with basic amenities',
                    amenities='WiFi,TV,AC,Bathroom',
                    bed_type='Single',
                    room_size_sqm=20,
                    cancellation_policy='Free cancellation up to 24h before check-in',
                    image_path='/static/img/rooms/single.jpg'
                ),
                RoomType(
                    name='Standard Double',
                    capacity=2,
                    base_price=3500.0,
                    description='Spacious double room perfect for couples',
                    amenities='WiFi,TV,AC,Bathroom,Mini Fridge',
                    bed_type='Double',
                    room_size_sqm=30,
                    cancellation_policy='Free cancellation up to 48h before check-in',
                    image_path='/static/img/rooms/double.jpg'
                ),
                RoomType(
                    name='Deluxe Suite',
                    capacity=3,
                    base_price=6000.0,
                    description='Luxurious suite with premium amenities',
                    amenities='WiFi,TV,AC,Bathroom,Mini Fridge,Balcony,Room Service',
                    bed_type='King',
                    room_size_sqm=50,
                    cancellation_policy='Non-refundable',
                    image_path='/static/img/rooms/suite.jpg'
                ),
                RoomType(
                    name='Family Room',
                    capacity=4,
                    base_price=7500.0,
                    description='Large room suitable for families',
                    amenities='WiFi,TV,AC,Bathroom,Mini Fridge,Extra Beds',
                    bed_type='2 Queen',
                    room_size_sqm=60,
                    cancellation_policy='Free cancellation up to 7 days before check-in',
                    image_path='/static/img/rooms/family.jpg'
                )
            ]
            db.session.add_all(room_types)
            print("- Created default room types with detailed specs")

        # Create Hotel Settings
        if HotelSetting.query.count() == 0:
            hotel = HotelSetting(
                name='Luxury Hotel & Spa',
                description='Experience the pinnacle of luxury in the heart of the city.',
                address='123 Hotel Avenue, Hospitality District',
                phone='+1 234 567 8900',
                email='info@luxuryhotel.com',
                check_in_time='14:00',
                check_out_time='11:00',
                policy_smoking='Non-smoking throughout the property',
                policy_pets='Pets allowed in designated rooms only',
                policy_cancellation='Standard cancellation policy applies',
                policy_id_req='Government issued ID required for all guests'
            )
            db.session.add(hotel)
            print("- Created hotel settings")
            
        # Create default pricing rule if none exists
        from datetime import date
        if PricingRule.query.count() == 0:
            default_rule = PricingRule(
                name='Default Rate',
                start_date=date(2000, 1, 1),
                end_date=date(2100, 12, 31),
                days_of_week='0,1,2,3,4,5,6',
                price_multiplier=1.0,
                is_active=True
            )
            db.session.add(default_rule)
            print("- Created default pricing rule covering all dates")
        if PricingRule.query.count() == 0:
            summer = PricingRule(name='Peak Summer', price_multiplier=1.2, start_date=datetime(2025, 6, 1).date(), end_date=datetime(2025, 8, 31).date())
            db.session.add(summer)
            print("- Created pricing rules")

        # Create promo code
        if PromoCode.query.count() == 0:
            welcome = PromoCode(code='WELCOME10', discount_percent=10.0, valid_from=datetime.utcnow(), is_active=True)
            db.session.add(welcome)
            print("- Created promo codes")
        
        # Create default services
        if Service.query.count() == 0:
            services = [
                Service(name='Room Service', price=500.0, category='room_service', description='24/7 room service'),
                Service(name='Laundry', price=300.0, category='laundry', description='Laundry service per item'),
                Service(name='Minibar', price=200.0, category='minibar', description='Minibar items'),
                Service(name='Extra Bed', price=1000.0, category='extra_bed', description='Additional bed in room'),
                Service(name='Late Checkout', price=1500.0, category='late_checkout', description='Checkout after 12 PM'),
                Service(name='Airport Pickup', price=2000.0, category='transport', description='Airport transfer service'),
                Service(name='Spa Service', price=3000.0, category='spa', description='Spa and massage service'),
                Service(name='Breakfast', price=500.0, category='food', description='Continental breakfast')
            ]
            db.session.add_all(services)
            print("- Created default services")
        
        db.session.commit()
        print("\n- Database initialization complete!")
        print("\n- Default Credentials:")
        print("   Email: admin@hotel.com")
        print("   Password: admin123")

if __name__ == '__main__':
    init_database()
