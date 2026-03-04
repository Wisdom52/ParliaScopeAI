"""
Script: clear_and_reseed_bills.py

Clears all existing Bill and BillImpact records from the database, then re-ingests
the 9 curated Kenyan parliamentary bills from the local DOCS/Bills folder using
the new rich 5-section AI summary format.

Usage (from ParliaScopeAI/backend directory):
    python scripts/clear_and_reseed_bills.py
"""

import sys
import os
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Ensure backend root is on the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.bill import Bill, BillImpact
from app.services.ai_pdf_parser import extract_raw_text
from app.services.impact_agent import generate_bill_summary, generate_bill_impact

# --------------------------------------------------
# Path to the local bills folder
# --------------------------------------------------
BILLS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "Docs", "Bills")
)


def clear_all_bills(db):
    """Delete all BillImpact and Bill rows."""
    logger.info("Clearing existing BillImpact records...")
    db.query(BillImpact).delete()
    logger.info("Clearing existing Bill records...")
    db.query(Bill).delete()
    db.commit()
    logger.info("✅ Database cleared — bills table is empty.")


def process_bill_pdf(pdf_path: str, title: str, db) -> Bill:
    """
    Extracts text from a local PDF, generates a rich AI summary + impact cards,
    and saves the Bill record to the database.
    """
    logger.info(f"📄 Processing: {title}")

    # 1. Extract raw text
    raw_text = extract_raw_text(pdf_path)
    if not raw_text or len(raw_text.strip()) < 100:
        logger.warning(f"  ⚠️  Very little text extracted from {title}. Storing with placeholder.")
        raw_text = f"Full text of '{title}' could not be extracted from the PDF."

    # 2. Generate rich structured summary (5 sections via Ollama)
    logger.info(f"  🤖 Generating AI summary for {title}...")
    summary = generate_bill_summary(raw_text)
    logger.info(f"  ✅ Summary generated ({len(summary)} chars)")

    # 3. Create Bill record
    bill = Bill(
        title=title,
        summary=summary,
        document_url=f"local://{os.path.basename(pdf_path)}",
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)

    # 4. Generate impact cards (SME, Student, Farmer)
    logger.info(f"  🎯 Generating impact cards for {title}...")
    impacts_data = generate_bill_impact(raw_text)
    for imp in impacts_data:
        new_impact = BillImpact(
            bill_id=bill.id,
            archetype=imp.get("archetype", "General"),
            description=imp.get("description", "No specific impact identified."),
            sentiment=imp.get("sentiment", "Neutral"),
        )
        db.add(new_impact)
    db.commit()
    logger.info(f"  ✅ {len(impacts_data)} impact card(s) saved for {title}")

    return bill


def main():
    db = SessionLocal()

    try:
        # --- Step 1: Clear existing bills ---
        clear_all_bills(db)

        # --- Step 2: Find all PDFs in DOCS/Bills ---
        if not os.path.isdir(BILLS_DIR):
            logger.error(f"Bills directory not found: {BILLS_DIR}")
            return

        pdf_files = sorted([
            f for f in os.listdir(BILLS_DIR)
            if f.lower().endswith(".pdf")
        ])

        if not pdf_files:
            logger.error("No PDF files found in the Bills directory.")
            return

        logger.info(f"Found {len(pdf_files)} bill PDF(s) in: {BILLS_DIR}")

        # --- Step 3: Process each PDF ---
        successful = []
        failed = []

        for filename in pdf_files:
            pdf_path = os.path.join(BILLS_DIR, filename)
            # Use the filename (without .pdf) as the title, clean it up
            title = filename.replace(".pdf", "").strip()

            try:
                bill = process_bill_pdf(pdf_path=pdf_path, title=title, db=db)
                successful.append(f"  ✅ [{bill.id}] {bill.title}")
            except Exception as e:
                logger.error(f"  ❌ Failed to process '{filename}': {e}")
                failed.append(f"  ❌ {filename}: {e}")

        # --- Step 4: Report ---
        print("\n" + "=" * 60)
        print("📋 BILL RESEED COMPLETE")
        print("=" * 60)
        print(f"\n✅ Successfully ingested ({len(successful)}):")
        for s in successful:
            print(s)
        if failed:
            print(f"\n❌ Failed ({len(failed)}):")
            for f in failed:
                print(f)
        print("\n" + "=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    main()
