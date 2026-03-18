"""
reingest_2026.py
================
Re-ingestion script for 2026 Hansards and Bills.

WHAT THIS DOES:
  1. Applies the `date` column migration to the `bills` table (safe to run multiple times).
  2. Clears ALL existing Hansard records (cascade-deletes speech_segments) and Bill records
     (cascade-deletes bill_impacts) from the database.
  3. Scrapes the official parliament website for 2026-dated documents only.
  4. Re-ingests each document with:
       - A realistic `date` field parsed from the document title.
       - Fresh AI summaries using the new structured SUMMARY_PROMPT / BILL_SUMMARY_PROMPT.

USAGE (run from the `backend` directory with venv activated):
    python scripts/reingest_2026.py

PREREQUISITES:
  - Ollama must be running locally (llama3.2:3b model loaded).
  - Backend DB must be accessible (the script uses the app's DB session).
  - python-dateutil must be installed (pip install python-dateutil).
"""

import asyncio
import sys
import os

# Ensure the backend app is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import SessionLocal, engine
from app.models.hansard import Hansard
from app.models.speech import SpeechSegment
from app.models.bill import Bill
from app.routes.ingest import perform_hansard_crawl, perform_bill_crawl

import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def apply_migrations(db):
    """Adds the `date` column to `bills` table if it doesn't already exist."""
    try:
        db.execute(text("ALTER TABLE bills ADD COLUMN IF NOT EXISTS date DATE;"))
        db.commit()
        logger.info("Migration applied: bills.date column ready.")
    except Exception as e:
        db.rollback()
        logger.warning(f"Migration note (likely already applied): {e}")


def clear_existing_documents(db):
    """Deletes all Hansards (cascades speech_segments) and all Bills (cascades impacts)."""
    logger.info("Clearing existing Hansard speech segments...")
    db.query(SpeechSegment).delete(synchronize_session=False)
    db.commit()

    logger.info("Clearing existing Hansard records...")
    db.query(Hansard).delete(synchronize_session=False)
    db.commit()

    logger.info("Clearing existing Bill records (impacts cascade)...")
    # Use raw SQL to handle cascade in case ORM doesn't auto-cascade
    db.execute(text("DELETE FROM bill_impacts;"))
    db.execute(text("DELETE FROM bills;"))
    db.commit()

    logger.info("All existing documents cleared from the database.")


async def run_reingest():
    db = SessionLocal()
    try:
        # Step 1: Apply migration for bills.date column
        apply_migrations(db)

        # Step 2: Clear old data
        clear_existing_documents(db)

        # Step 3: Re-ingest 2026 Hansards (limit 20 — scraper already filters to 2026 only)
        logger.info("=" * 60)
        logger.info("Starting 2026 Hansard ingestion...")
        logger.info("=" * 60)
        hansard_results = await perform_hansard_crawl(db, limit=20, ai_parsing=True)
        logger.info(f"Hansard ingestion complete. Processed: {len(hansard_results)} documents.")
        for h in hansard_results:
            logger.info(f"  ✓ {h.get('title', 'Unknown')} — {h.get('segments', 0)} segments")

        # Step 4: Re-ingest 2026 Bills (limit 20 — scraper already filters to 2026 only)
        logger.info("=" * 60)
        logger.info("Starting 2026 Bill ingestion...")
        logger.info("=" * 60)
        bill_results = await perform_bill_crawl(db, limit=20)
        logger.info(f"Bill ingestion complete. Processed: {len(bill_results)} documents.")
        for b in bill_results:
            logger.info(f"  ✓ {b.get('title', 'Unknown')} — impacts: {b.get('impacts', 0)}")

        logger.info("=" * 60)
        logger.info("Re-ingestion of 2026 documents complete!")
        logger.info(f"  Hansards ingested: {len(hansard_results)}")
        logger.info(f"  Bills ingested:    {len(bill_results)}")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Re-ingestion failed: {e}", exc_info=True)
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(run_reingest())
