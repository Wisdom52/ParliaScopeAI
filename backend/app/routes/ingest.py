from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.pdf_parser import process_hansard_pdf
from app.services.scraper import get_latest_hansard_links
from app.models.hansard import Hansard
import shutil
import tempfile
import os
import httpx
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

@router.post("/crawl")
async def crawl_hansards(limit: int = 5, db: Session = Depends(get_db)):
    """Automated crawl of the official parliament website for the first N hansards."""
    links = get_latest_hansard_links(limit=limit)
    ingested = []
    
    for link in links:
        # Check if already ingested by URL
        existing = db.query(Hansard).filter(Hansard.pdf_url == link['url']).first()
        if existing:
            continue
            
        # 1. Create Hansard record
        hansard = Hansard(
            title=link['title'],
            pdf_url=link['url']
        )
        db.add(hansard)
        db.commit()
        db.refresh(hansard)
        
        # 2. Download and process
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(link['url'])
                if resp.status_code == 200:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                        tmp.write(resp.content)
                        tmp_path = tmp.name
                    
                    try:
                        count = process_hansard_pdf(tmp_path, db, hansard_id=hansard.id)
                        ingested.append({"title": link['title'], "segments": count})
                    finally:
                        os.remove(tmp_path)
                else:
                    logger.error(f"Download failed for {link['url']}: Status {resp.status_code}")
        except Exception as e:
            logger.error(f"Failed to process {link['url']}: {e}")
            
    return {"status": "success", "total_links_found": len(links), "ingested_now": ingested}

@router.post("/hansard")
async def ingest_hansard(file: UploadFile = File(...), title: str = None, db: Session = Depends(get_db)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF allowed.")
    
    # 1. Create Hansard record for manual upload
    hansard = Hansard(
        title=title or file.filename,
        pdf_url="manual_upload"
    )
    db.add(hansard)
    db.commit()
    db.refresh(hansard)

    # 2. Save upload and process
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    
    try:
        count = process_hansard_pdf(tmp_path, db, hansard_id=hansard.id)
        return {"message": "Hansard processed successfully", "id": hansard.id, "segments_created": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        os.remove(tmp_path)
