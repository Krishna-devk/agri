from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

import certifi

# We'll use mysql+mysqlconnector to connect to the TiDB MySQL instance
# TiDB Cloud requires secure transport (SSL)
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+mysqlconnector://2efYPEWJ1rcXh3R.root:VUhcqAtSNtJ20OU4@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/farmer")

engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True, 
    pool_recycle=3600,
    connect_args={
        "ssl_ca": certifi.where(),
        "ssl_disabled": False
    } 
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
