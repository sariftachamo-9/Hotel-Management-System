from app import create_app
from models import db, Room, RoomType

app = create_app()

with app.app_context():
    # Ensure at least one RoomType exists
    room_type = RoomType.query.first()
    if not room_type:
        room_type = RoomType(name='Deluxe', capacity=2, base_price=2000, description='Deluxe Room', amenities='Wi-Fi,AC,TV')
        db.session.add(room_type)
        db.session.commit()
        print('Created default RoomType: Deluxe')

    # Create 20 rooms if not already present
    existing_rooms = Room.query.count()
    if existing_rooms < 20:
        for i in range(existing_rooms + 1, 21):
            room = Room(room_number=f'{100+i}', room_type_id=room_type.id, floor=(i-1)//5+1, status='available', is_active=True)
            db.session.add(room)
        db.session.commit()
        print('Created demo rooms.')
    else:
        print('20 or more rooms already exist.')
