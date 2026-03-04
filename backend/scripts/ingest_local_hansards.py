import sys
import os
import asyncio

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.hansard import Hansard
from app.services.ai_pdf_parser import process_hansard_with_ai

async def ingest_local_files():
    db = SessionLocal()
    docs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Docs', 'Hansards'))
    
    if not os.path.exists(docs_dir):
        print(f"Directory not found: {docs_dir}")
        db.close()
        return

    files = [f for f in os.listdir(docs_dir) if f.endswith('.pdf')]
    if not files:
        print("No PDFs found in Docs/Hansards.")
        db.close()
        return

    print(f"Found {len(files)} PDFs in local folder. Processing the first 1 for testing.")
    files = files[:1]

    for file_name in files:
        file_path = os.path.join(docs_dir, file_name)
        title = file_name.replace(".pdf", "")
        
        # Check if already ingested
        existing = db.query(Hansard).filter(Hansard.title == title).first()
        if existing:
            print(f"Skipping already ingested file: {title}")
            continue
            
        print(f"Starting ingestion for: {title}")
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
            # Refresh to see summary
            db.refresh(hansard)
        except Exception as e:
            print(f"Error processing {title}: {e}")
            
    db.close()
    print("Local ingestion complete.")

if __name__ == "__main__":
    asyncio.run(ingest_local_files())
