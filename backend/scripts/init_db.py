import sys
from pathlib import Path
from sqlalchemy import create_engine, text

sys.path.append(str(Path(__file__).parent.parent))

from api.database import engine, Base, DATABASE_URL
from api.db_models import FarmerProfile

def init_db():
    print("Connecting to database server...")
    
    try:
        base_url = DATABASE_URL.rsplit('/', 1)[0] + '/'
        db_name = DATABASE_URL.rsplit('/', 1)[1]
        
        temp_engine = create_engine(base_url, connect_args={"ssl_disabled": False})
        
        with temp_engine.connect() as conn:
            print(f"Checking if database '{db_name}' exists...")
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{db_name}`"))
            conn.commit()
            print(f"Database '{db_name}' is ready.")
        temp_engine.dispose()
    except Exception as e:
        print(f"Warning/Error during DB creation phase: {e}")

    try:
        print("Creating tables...")
        Base.metadata.create_all(bind=engine)
        print("Successfully created farmer_profiles table!")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    init_db()
