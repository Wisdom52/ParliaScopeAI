import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/parliascope")

engine = create_engine(
    DATABASE_URL,
    pool_size=10,        # Persistent connections kept alive in the pool
    max_overflow=20,     # Extra connections allowed during traffic spikes (30 total max)
    pool_timeout=30,     # Wait up to 30s for a connection before raising an error
    pool_pre_ping=True,  # Test connections before use to recycle stale ones
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
