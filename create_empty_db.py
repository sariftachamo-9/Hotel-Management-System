from flask import Flask
from config import config
from models import db

def create_empty_database():
    """Create empty database with tables only (no seed data)"""
    app = Flask(__name__)
    app.config.from_object(config['development'])
    
    db.init_app(app)
    
    with app.app_context():
        # Drop all existing tables
        db.drop_all()
        print("✓ Dropped all existing tables")
        
        # Create all tables fresh
        db.create_all()
        print("✓ Created all database tables")
        
        print("\n✅ Empty database created successfully!")
        print("\n📝 Note: No default data has been seeded.")
        print("   You can now add data through the application.")

if __name__ == '__main__':
    create_empty_database()
