import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import SessionLocal
from app.models.bill import Bill, BillImpact
from app.services.ai_pdf_parser import extract_raw_text, generate_bill_summary
from app.services.impact_agent import generate_bill_impact
from app.services.scraper import parse_date_from_title
from app.services.ocr_service import extract_text_via_ocr
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DOCS_BILLS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "DOCS", "Bills")

def clear_existing_bills(db):
    logger.info("Clearing existing Bill records (impacts cascade)...")
    db.execute(text("DELETE FROM bill_impacts;"))
    db.execute(text("DELETE FROM bills;"))
    db.commit()
    logger.info("All existing Bill documents cleared.")

async def process_local_bill(db, filename, filepath):
    title = filename.replace(".pdf", "").replace("_", " ").title()
    doc_date = parse_date_from_title(title)
    
    logger.info(f"Processing Local Bill: {title}")
    
    raw_text = extract_raw_text(filepath)
    if not raw_text:
        logger.warning(f"No text extracted from {filename} (likely a scanned image). Starting OCR...")
        raw_text = await extract_text_via_ocr(filepath, max_pages=10) # Limit to 10 pages for speed
        if not raw_text:
            logger.error(f"OCR failed for {filename}")
            raw_text = ""
    
    logger.info(f"Final text length for {filename}: {len(raw_text)} characters")
        
    new_bill = Bill(
        title=title,
        date=doc_date,
        document_url=f"localhost/DOCS/Bills/{filename}", # Mock URL for local
    )
    db.add(new_bill)
    db.flush() # get ID
    
    if raw_text:
        logger.info(f"Generating AI summary for {title}...")
        summary = await generate_bill_summary(raw_text)
        logger.info(f"Summary generated: {len(summary) if summary else 0} chars")
        new_bill.summary = summary
    else:
        new_bill.summary = f"Summary pending. This document ({filename}) appears to be a scanned image and requires OCR for analysis."
    
    db.commit()
    
    impacts_added = 0
    if raw_text:
        try:
            impacts_data = generate_bill_impact(raw_text[:8000])
            for imp in impacts_data:
                new_impact = BillImpact(
                    bill_id=new_bill.id,
                    archetype=imp.get('archetype', 'General'),
                    description=imp.get('description', 'None'),
                    sentiment=imp.get('sentiment', 'Neutral')
                )
                db.add(new_impact)
            db.commit()
            impacts_added = len(impacts_data)
        except Exception as e:
            logger.error(f"Impact Analysis failed for {title}: {e}")
            db.rollback()
    else:
        logger.info(f"Skipping impact analysis for {title} due to no text.")
        
    return {"title": title, "impacts": impacts_added}

async def run_reingest():
    db = SessionLocal()
    try:
        clear_existing_bills(db)

        logger.info("=" * 60)
        logger.info(f"Starting Local Bill ingestion from {DOCS_BILLS_DIR}...")
        logger.info("=" * 60)
        
        if not os.path.exists(DOCS_BILLS_DIR):
            logger.error(f"Directory not found: {DOCS_BILLS_DIR}")
            return
            
        pdf_files = [f for f in os.listdir(DOCS_BILLS_DIR) if f.lower().endswith(".pdf")]
        logger.info(f"Found {len(pdf_files)} local PDFs.")
        
        bill_results = []
        for filename in pdf_files:
            filepath = os.path.join(DOCS_BILLS_DIR, filename)
            result = await process_local_bill(db, filename, filepath)
            bill_results.append(result)

        logger.info(f"Bill ingestion complete. Processed: {len(bill_results)} documents.")
        for b in bill_results:
            logger.info(f"  ✓ {b.get('title', 'Unknown')} — impacts: {b.get('impacts', 0)}")

        logger.info("=" * 60)
        logger.info(f"Bills ingested: {len(bill_results)}")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Re-ingestion failed: {e}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_reingest())
