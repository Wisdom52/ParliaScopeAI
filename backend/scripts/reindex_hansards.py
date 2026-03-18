import sys
import os
import asyncio
from sqlalchemy.orm import Session

# Setup paths
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.hansard import Hansard
from app.models.speech import SpeechSegment
from app.services.ai_pdf_parser import process_hansard_with_ai
import httpx

async def reindex():
    print("🚀 Starting Hansard Re-indexing for Fact Shield...")
    db = SessionLocal()
    try:
        # Check for existing segments
        existing_count = db.query(SpeechSegment).count()
        if existing_count > 0:
            print(f"⚠️ Found {existing_count} existing segments. Clearing them for fresh re-indexing...")
            db.query(SpeechSegment).delete()
            db.commit()

        hansards = db.query(Hansard).all()
        print(f"📄 Found {len(hansards)} Hansards to process.")

        for h in hansards:
            print(f"🔍 Processing: {h.title}")
            if h.pdf_url == "manual_upload":
                print(f"⏭️ Skipping manual upload Hansard ID {h.id} (no source path stored).")
                continue

            # Download or use local cache if exists (simplified for now: download to temp)
            import tempfile
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(h.pdf_url, timeout=60.0)
                    if resp.status_code == 200:
                        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                            tmp.write(resp.content)
                            tmp_path = tmp.name
                        
                        try:
                            # Use AI parsing to generate segments and embeddings
                            # Note: This requires llama3.2:3b to be pulled
                            print(f"⚙️ Segmenting Hansard {h.id} using AI...")
                            count = await process_hansard_with_ai(tmp_path, db, hansard_id=h.id)
                            print(f"✅ Created {count} segments for Hansard {h.id}.")
                        finally:
                            if os.path.exists(tmp_path):
                                os.remove(tmp_path)
                    else:
                        print(f"❌ Failed to download {h.pdf_url}: Status {resp.status_code}")
            except Exception as e:
                print(f"❌ Error processing Hansard {h.id}: {e}")
        
        print("🎉 Re-indexing complete!")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(reindex())
