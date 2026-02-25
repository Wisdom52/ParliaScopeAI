from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.pdf_parser import process_hansard_pdf
from app.services.scraper import get_latest_hansard_links
from app.models.hansard import Hansard
from app.services.ai_pdf_parser import process_hansard_with_ai
import shutil
import tempfile
import os
import httpx
import logging
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

async def perform_hansard_crawl(db: Session, limit: int = 6, ai_parsing: bool = True):
    """Internal logic to crawl and ingest Hansards."""
    logger.info(f"Starting background Hansard crawl (Limit: {limit}, AI: {ai_parsing})")
    links = await asyncio.to_thread(get_latest_hansard_links, limit=limit)
    ingested = []
    
    for i, link in enumerate(links):
        logger.info(f"Processing Hansard {i+1}/{len(links)}: {link['title']}")
        # Check if already ingested by URL
        existing = db.query(Hansard).filter(Hansard.pdf_url == link['url']).first()
        if existing:
            logger.info(f"Hansard already exists, skipping: {link['title']}")
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
                resp = await client.get(link['url'], timeout=60.0)
                if resp.status_code == 200:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                        tmp.write(resp.content)
                        tmp_path = tmp.name
                    
                    try:
                        logger.info(f"Starting AI digestion for: {link['title']}")
                        if ai_parsing:
                            count = await process_hansard_with_ai(tmp_path, db, hansard_id=hansard.id)
                        else:
                            count = process_hansard_pdf(tmp_path, db, hansard_id=hansard.id)
                        
                        # Fetch the updated record to see the summary
                        db.refresh(hansard)
                        logger.info(f"Successfully processed {link['title']}. Segments created: {count}")
                        ingested.append({
                            "title": link['title'], 
                            "segments": count, 
                            "summary_length": len(hansard.ai_summary) if hansard.ai_summary else 0
                        })
                    except Exception as e:
                        logger.error(f"Error during AI processing of {link['title']}: {e}")
                    finally:
                        if os.path.exists(tmp_path):
                            os.remove(tmp_path)
                    
                    # Small delay between Hansards as requested for sequential processing stability
                    logger.info(f"Waiting 5 seconds before next document...")
                    await asyncio.sleep(5)
                else:
                    logger.error(f"Download failed for {link['url']}: Status {resp.status_code}")
        except Exception as e:
            logger.error(f"Failed to process {link['url']}: {e}")
            
    return ingested

@router.post("/crawl")
async def crawl_hansards(limit: int = 6, ai_parsing: bool = True, db: Session = Depends(get_db)):
    """Automated crawl of the official parliament website for the first N hansards."""
    ingested = await perform_hansard_crawl(db, limit, ai_parsing)
    return {"status": "success", "ingested_now": ingested}

@router.post("/hansard")
async def ingest_hansard(file: UploadFile = File(...), title: str = None, ai_parsing: bool = False, db: Session = Depends(get_db)):
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
        if ai_parsing:
            count = await process_hansard_with_ai(tmp_path, db, hansard_id=hansard.id)
        else:
            count = process_hansard_pdf(tmp_path, db, hansard_id=hansard.id)
        return {"message": "Hansard processed successfully", "id": hansard.id, "segments_created": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        os.remove(tmp_path)
