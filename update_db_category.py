import sqlite3
import os

db_path = os.path.join(os.getcwd(), 'instance', 'hotel_management.db')

if not os.path.exists(db_path):
    # Fallback to root if instance folder not used or different config
    db_path = 'hotel_management.db'

print(f"Connecting to database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(room_types)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if 'category' not in columns:
        print("Adding 'category' column to 'room_types' table...")
        cursor.execute("ALTER TABLE room_types ADD COLUMN category TEXT DEFAULT 'Standard'")
        conn.commit()
        print("Column added successfully.")
    else:
        print("'category' column already exists.")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
