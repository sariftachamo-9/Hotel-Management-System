from app import create_app
from models import db, User, Guest

app = create_app()

with app.app_context():
    def create_guest(email, name):
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(email=email, role='Guest', is_active=True)
            user.set_password('guest123')
            db.session.add(user)
            db.session.flush()
            guest = Guest(
                user_id=user.id,
                full_name=name,
                phone='9876543210',
                id_type='Citizenship',
                id_number='CITZ1234',
                email=email,
                nationality='Nepal'
            )
            db.session.add(guest)
            db.session.commit()
            print(f"Guest account {email} created.")
        else:
            print(f"Guest account {email} already exists.")

    create_guest('guest2@hotel.com', 'Guest Two')
    create_guest('guest3@hotel.com', 'Guest Three')
