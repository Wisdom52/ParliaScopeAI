from app.database import engine, Base
from sqlalchemy import text
from app.models.hansard import Hansard
from app.models.speech import SpeechSegment
from app.models.speaker import Speaker
from app.models.location import County, Constituency

def init_db():
    print("Enabling pgvector extension...")
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")

if __name__ == "__main__":
    init_db()
