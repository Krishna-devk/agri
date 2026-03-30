import os
import certifi
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Testing connection to: {DATABASE_URL.split('@')[-1]}")

try:
    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "ssl_ca": certifi.where(),
            "ssl_disabled": False
        }
    )
    with engine.connect() as connection:
        result = connection.execute(text("SELECT VERSION();"))
        print(f"Successfully connected! Version: {result.fetchone()[0]}")
        
        db_result = connection.execute(text("SELECT DATABASE();"))
        print(f"Current Database: {db_result.fetchone()[0]}")
except Exception as e:
    print(f"Connection failed: {e}")
