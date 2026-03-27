import sys
import os
import time

backend_path = r'c:\Users\Admin\Documents\ParliaScopeAI\backend'
if backend_path not in sys.path:
    sys.path.append(backend_path)

from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.database import SessionLocal
from app.models.speech import SpeechSegment
from app.models.leader_stance import LeaderStance
from app.services.stance_analyzer import analyze_speaker_consistency

def precompute_all_stances():
    db = SessionLocal()
    try:
        # Find all speakers who HAVE segments but NO stances yet
        stmt = select(SpeechSegment.speaker_id, func.count(SpeechSegment.id))\
            .filter(SpeechSegment.speaker_id != None)\
            .group_by(SpeechSegment.speaker_id)
        
        candidates = db.execute(stmt).all()
        print(f"Found {len(candidates)} speakers with speech segments.")
        
        processed = 0
        skipped = 0
        errors = 0
        
        for speaker_id, count in candidates:
            # Check if stances already exist
            existing = db.query(LeaderStance).filter(LeaderStance.speaker_id == speaker_id).first()
            if existing:
                print(f"Skipping Speaker {speaker_id} (Stance already exists).")
                skipped += 1
                continue
            
            if count < 1:
                print(f"Skipping Speaker {speaker_id} (Too few segments: {count}).")
                skipped += 1
                continue
                
            print(f"[{processed+1}/{len(candidates)}] Analysing Speaker {speaker_id} ({count} segments)...")
            try:
                result = analyze_speaker_consistency(db, speaker_id)
                if result.get('topic_breakdown'):
                    print(f"  Done: {len(result['topic_breakdown'])} topics found. Score: {result.get('overall_consistency')}%")
                    processed += 1
                else:
                    print(f"  No topics found: {result.get('summary')}")
                    errors += 1
            except Exception as e:
                print(f"  Failed for Speaker {speaker_id}: {e}")
                errors += 1
            
            # Small delay to keep system responsive if running many
            time.sleep(0.5)

        print(f"\nPre-computation Complete!")
        print(f"Total Processed: {processed}")
        print(f"Skipped: {skipped}")
        print(f"Errors/Empty: {errors}")

    finally:
        db.close()

if __name__ == "__main__":
    precompute_all_stances()
