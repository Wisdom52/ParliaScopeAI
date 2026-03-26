import sys
import os

backend_path = r'c:\Users\Admin\Documents\ParliaScopeAI\backend'
if backend_path not in sys.path:
    sys.path.append(backend_path)

from app.database import SessionLocal
from app.models.leader_stance import LeaderStance

def cleanup():
    db = SessionLocal()
    try:
        stances = db.query(LeaderStance).all()
        updated = 0
        for s in stances:
            # Heuristic scale fix: 0.1-10.0 likely means 1-100
            if 0 < s.consistency_score <= 10.0:
                print(f"Scaling Up: {s.topic} ({s.consistency_score} -> {s.consistency_score * 10})")
                s.consistency_score *= 10.0
                updated += 1
            
        db.commit()
        print(f"Successfully updated {updated} records.")
    except Exception as e:
        print(f"Cleanup Failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup()
