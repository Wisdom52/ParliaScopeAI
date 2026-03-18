import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import SessionLocal
from app.routes.ingest import perform_bill_crawl

import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def clear_existing_bills(db):
    logger.info("Clearing existing Bill records (impacts cascade)...")
    db.execute(text("DELETE FROM bill_impacts;"))
    db.execute(text("DELETE FROM bills;"))
    db.commit()
    logger.info("All existing Bill documents cleared.")

async def run_reingest():
    db = SessionLocal()
    try:
        clear_existing_bills(db)

        # Re-ingest 2026 Bills (limit 20)
        logger.info("=" * 60)
        logger.info("Starting 2026 Bill ingestion...")
        logger.info("=" * 60)
        bill_results = await perform_bill_crawl(db, limit=20)
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
