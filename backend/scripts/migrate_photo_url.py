import sys
from pathlib import Path
from sqlalchemy import create_engine, text

# Add the parent directory to sys.path
sys.path.append(str(Path(__file__).parent.parent))

from api.database import engine

def migrate():
    print("Running migration to add photo_url column...")
    query = text("ALTER TABLE farmer_profiles ADD COLUMN photo_url MEDIUMTEXT;")
    
    try:
        with engine.begin() as conn:
            conn.execute(query)
            print("Successfully added photo_url column (MEDIUMTEXT) to farmer_profiles table!")
    except Exception as e:
        if "Duplicate column name" in str(e) or "already exists" in str(e).lower():
            print("photo_url column already exists.")
        else:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    migrate()
