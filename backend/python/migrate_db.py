import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'webos.db')

def migrate():
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if columns exist
        cursor.execute("PRAGMA table_info(study_materials)")
        columns = [c[1] for c in cursor.fetchall()]

        if 'is_file' not in columns:
            print("Adding 'is_file' column...")
            cursor.execute("ALTER TABLE study_materials ADD COLUMN is_file BOOLEAN DEFAULT 0")
        
        if 'file_path' not in columns:
            print("Adding 'file_path' column...")
            cursor.execute("ALTER TABLE study_materials ADD COLUMN file_path VARCHAR(255)")

        conn.commit()
        print("Migration successful!")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
