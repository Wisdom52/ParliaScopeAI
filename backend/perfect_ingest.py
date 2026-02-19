import asyncio
import os
import sys
# Ensure app is in path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.hansard import Hansard
from app.models.speech import SpeechSegment
from app.services.ai_pdf_parser import process_hansard_with_ai

async def main():
    db = SessionLocal()
    # Find the specific Hansard
    target_title = "The Hansard - Tuesday, 10 February 2026"
    hansard = db.query(Hansard).filter(Hansard.title.like(f"%{target_title}%")).first()
    
    if not hansard:
        print(f"Target Hansard '{target_title}' not found in DB.")
        return

    print(f"Found Hansard ID {hansard.id}: {hansard.title}")
    
    # 1. Clean existing segments for this Hansard to avoid duplicates
    db.query(SpeechSegment).filter(SpeechSegment.hansard_id == hansard.id).delete()
    db.commit()
    print("Cleared old segments.")

    # 2. Download PDF (if local copy doesn't exist)
    # For this task, we'll try to use the tmp folder or redownload
    import httpx
    import tempfile
    
    print(f"Processing PDF from {hansard.pdf_url}...")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        async with httpx.AsyncClient() as client:
            resp = await client.get(hansard.pdf_url)
            tmp.write(resp.content)
            tmp_path = tmp.name
            
    try:
        print("Starting AI Extraction (this may take a few minutes)...")
        count = await process_hansard_with_ai(tmp_path, db, hansard.id)
        print(f"SUCCESS: Created {count} high-accuracy segments.")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
