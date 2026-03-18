import sys
import os
import asyncio
from sqlalchemy.orm import Session
import re

# Setup paths
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.hansard import Hansard
from app.models.speech import SpeechSegment
from app.services.pdf_parser import extract_text_from_pdf, parse_hansard_text, match_speaker
from app.services.embedding import get_embedding
import httpx
import tempfile

async def reindex_heuristic():
    print("🚀 Starting FASTER Hansard Re-indexing (Heuristic) for Fact Shield...")
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
            print(f"\n🔍 Processing: {h.title}")
            if not h.pdf_url or h.pdf_url == "manual_upload":
                print(f"⏭️ Skipping Hansard ID {h.id} (no valid URL).")
                continue

            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(h.pdf_url, timeout=30.0)
                    if resp.status_code == 200:
                        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                            tmp.write(resp.content)
                            tmp_path = tmp.name
                        
                        try:
                            print(f"⚙️ Parsing PDF {h.id} via heuristic...")
                            raw_text = extract_text_from_pdf(tmp_path)
                            segments = parse_hansard_text(raw_text)
                            
                            print(f"✨ Found {len(segments)} segments. Saving to DB with embeddings...")
                            for i, seg in enumerate(segments):
                                speaker_name = seg['speaker']
                                content = seg['content']
                                if not content or len(content) < 20: continue

                                speaker_obj = match_speaker(speaker_name, db)
                                
                                new_segment = SpeechSegment(
                                    hansard_id=h.id,
                                    speaker_name=speaker_name,
                                    content=content,
                                    speaker_id=speaker_obj.id if speaker_obj else None,
                                    embedding=get_embedding(content)
                                )
                                db.add(new_segment)
                                
                                if i % 10 == 0:
                                    print(f"  Processed {i}/{len(segments)} segments...")

                            db.commit()
                            print(f"✅ Completed Hansard {h.id}.")
                        finally:
                            if os.path.exists(tmp_path):
                                os.remove(tmp_path)
                    else:
                        print(f"❌ Failed to download {h.pdf_url}: Status {resp.status_code}")
            except Exception as e:
                print(f"❌ Error processing Hansard {h.id}: {e}")
                db.rollback()
        
        final_count = db.query(SpeechSegment).count()
        print(f"\n🎉 Re-indexing complete! Created {final_count} total segments.")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(reindex_heuristic())
