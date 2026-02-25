import sys
import os

# Add backend to path
sys.path.append('c:/Users/Admin/Documents/ParliaScopeAI/backend')

from app.database import SessionLocal, Base, engine
from app.models.hansard import Hansard
from app.models.speech import SpeechSegment
from app.models.speaker import Speaker

def clear_data():
    db = SessionLocal()
    try:
        print("Deleting SpeechSegments...")
        db.query(SpeechSegment).delete()
        print("Deleting Hansards...")
        db.query(Hansard).delete()
        db.commit()
        print("Success! Database cleared.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clear_data()
