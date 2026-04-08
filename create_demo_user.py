from app import create_app
from models import db, User, Guest

app = create_app()

with app.app_context():
    users = User.query.all()
    print(f"Total users: {len(users)}")
    
    admin_exists = any(u.role == 'Admin' for u in users)
    guest_exists = any(u.role == 'Guest' for u in users)
    
    if not guest_exists:
        print("Creating demo guest user...")
        # Create User
        demo_user = User(email='guest@hotel.com', role='Guest', is_active=True)
        demo_user.set_password('guest123')
        db.session.add(demo_user)
        db.session.flush() # Get the ID
        
        # Create Guest profile
        demo_guest = Guest(
            user_id=demo_user.id,
            full_name='Demo Guest',
            phone='1234567890',
            id_type='Passport',
            id_number='A1234567',
            email='guest@hotel.com',
            nationality='DemoCountry'
        )
        db.session.add(demo_guest)
        db.session.commit()
        print("Demo guest user created successfully!")
    else:
        print("A guest user already exists.")
        
    print("\nCurrent Users:")
    for u in User.query.all():
        print(f"- {u.email} (Role: {u.role})")
