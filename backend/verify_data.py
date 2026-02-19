import sys
import os
# Ensure app is in path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.location import County, Constituency
from app.models.speaker import Speaker
from app.models.hansard import Hansard
from app.models.speech import SpeechSegment

def verify():
    db = SessionLocal()
    try:
        count = db.query(Hansard).count()
        print(f"\n--- HANSARDS IN DATABASE: {count} ---")
        for h in db.query(Hansard).order_by(Hansard.id).all():
            seg_count = db.query(SpeechSegment).filter(SpeechSegment.hansard_id == h.id).count()
            print(f"ID {h.id}: {h.title}")
            print(f"  Segments: {seg_count}")
            print(f"  URL: {h.pdf_url[:80]}...")
            print("-" * 20)
    except Exception as e:
        print(f"Verification failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify()
