from app import create_app
from models import db, RoomType

# Set your new prices here
NEW_PRICES = {
    'Standard Single': 2000.0,
    'Standard Double': 3500.0,
    'Deluxe Suite': 7000.0,
    'Family Room': 4000.0  # Lowered price
}

def update_prices():
    app = create_app()
    with app.app_context():
        for name, price in NEW_PRICES.items():
            room_type = RoomType.query.filter_by(name=name).first()
            if room_type:
                print(f"Updating {name} from {room_type.base_price} to {price}")
                room_type.base_price = price
        db.session.commit()
        print("Room prices updated!")

if __name__ == '__main__':
    update_prices()
