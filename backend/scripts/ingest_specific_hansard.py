import sys
import os
import asyncio
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.hansard import Hansard
from app.services.ai_pdf_parser import process_hansard_with_ai

async def ingest_specific_file(file_name):
    db = SessionLocal()
    docs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Docs', 'Hansards'))
    
    file_path = os.path.join(docs_dir, file_name)
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        db.close()
        return

    title = file_name.replace(".pdf", "")
    print(f"Starting ingestion for: {title}")
    
    # Check if already ingested
    existing = db.query(Hansard).filter(Hansard.title == title).first()
    if existing:
        print(f"Already ingested (or ingestion started) for: {title}")
        db.close()
        return
        
    hansard = Hansard(
        title=title,
        pdf_url=f"local://{file_name}"
    )
    db.add(hansard)
    db.commit()
    db.refresh(hansard)
    
    try:
        print(f"Running AI parsing for {title}...")
        count = await process_hansard_with_ai(file_path, db, hansard_id=hansard.id)
        print(f"Successfully processed {title}. Segments created: {count}")
    except Exception as e:
        print(f"Error processing {title}: {e}")
            
    db.close()

if __name__ == "__main__":
    asyncio.run(ingest_specific_file("Hansard Report - Thursday, 16th October 2025 (P).pdf"))
