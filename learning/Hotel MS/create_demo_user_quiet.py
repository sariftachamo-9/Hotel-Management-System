from app import create_app
from models import db, User, Guest
import traceback

app = create_app()
# Disable SQL Alchemy logging for cleaner output
app.config['SQLALCHEMY_ECHO'] = False

output = []

try:
    with app.app_context():
        users = User.query.all()
        output.append(f"Total users: {len(users)}")
        
        guest_exists = any(u.role == 'Guest' for u in users)
        
        if not guest_exists:
            output.append("Creating demo guest user...")
            demo_user = User(email='guest@hotel.com', role='Guest', is_active=True)
            demo_user.set_password('guest123')
            db.session.add(demo_user)
            db.session.flush()

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
            output.append("Demo guest user created successfully!")
        else:
            output.append("A guest user already exists.")
            
        output.append("\nCurrent Users:")
        for u in User.query.all():
            output.append(f"- {u.email} (Role: {u.role})")
except Exception as e:
    output.append("ERROR OCCURRED:")
    output.append(traceback.format_exc())

with open('demo_output.txt', 'w') as f:
    f.write('\n'.join(output))
