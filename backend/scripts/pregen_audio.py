import asyncio
import os
import sys

# Add the parent directory to sys.path to allow importing from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.bill import Bill
from app.models.hansard import Hansard
from app.services.audio_engine import get_document_brief
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def generate_all():
    db = SessionLocal()
    try:
        bills = db.query(Bill).filter(Bill.summary != None).all()
        hansards = db.query(Hansard).filter(Hansard.ai_summary != None).all()
        
        logger.info(f"Found {len(bills)} Bills and {len(hansards)} Hansards with summaries to process.")
        
        for bill in bills:
            logger.info(f"Generating audio for Bill ID={bill.id}: {bill.title}")
            try:
                await get_document_brief(db, bill.id, "bill", "en")
                await get_document_brief(db, bill.id, "bill", "sw")
            except Exception as e:
                logger.error(f"Failed bill ID={bill.id}: {e}")
            
        for hansard in hansards:
            logger.info(f"Generating audio for Hansard ID={hansard.id}: {hansard.title}")
            try:
                await get_document_brief(db, hansard.id, "hansard", "en")
                await get_document_brief(db, hansard.id, "hansard", "sw")
            except Exception as e:
                logger.error(f"Failed hansard ID={hansard.id}: {e}")
            
        logger.info("Finished pre-generating all audio files.")
    except Exception as e:
        logger.error(f"Critical error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(generate_all())
