import os
import sys
import requests
import pdfplumber
import io

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.speaker import Speaker
import urllib3
urllib3.disable_warnings()

PDF_URL = "https://www.parliament.go.ke/sites/default/files/2025-12/List%20of%20Members%20by%20Parties%2013th%20Parliament%20as%20at%2002122025.pdf"


def is_number_row(val: str) -> bool:
    """Returns True if val looks like a row number (e.g. '1.', '22.')"""
    return val.replace('.', '').strip().isdigit()


def sync_mps():
    print("Downloading MP list PDF...")
    try:
        response = requests.get(PDF_URL, verify=False, timeout=30)
        response.raise_for_status()
    except Exception as e:
        print(f"Error: {e}")
        return

    print("Parsing PDF...")
    db = SessionLocal()

    # First, wipe all bad rows from the previous failed run (those with names like "Hon. No." or "Hon. 1.")
    deleted = 0
    for s in db.query(Speaker).all():
        if s.name and (s.name.endswith('.') or 'No.' in s.name):
            db.delete(s)
            deleted += 1
    db.commit()
    print(f"Cleaned up {deleted} bad rows from previous run.")

    added_count = 0
    updated_count = 0

    try:
        with pdfplumber.open(io.BytesIO(response.content)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        # Strip empty cells
                        cleaned = [str(x).replace('\n', ' ').strip() for x in row if x and str(x).strip()]
                        if len(cleaned) < 4:
                            continue

                        # Detect header row
                        if "NAME" in cleaned[0].upper() or "NAME" in cleaned[1].upper():
                            continue

                        # First col should be a row number like "1." or "22."
                        if not is_number_row(cleaned[0]):
                            continue

                        # cols: row_num, name, constituency, party
                        name_raw = cleaned[1]
                        constituency_raw = cleaned[2]
                        party = cleaned[3]

                        # Prefix with "Hon."
                        name = f"Hon. {name_raw}" if not name_raw.upper().startswith("HON") else name_raw

                        # Determine county vs constituency
                        county_name = None
                        constituency_name = constituency_raw
                        if "(CWR)" in constituency_raw:
                            county_name = constituency_raw.replace("(CWR)", "").strip()
                            constituency_name = None
                        elif "(Nominated)" in constituency_raw.lower() or "nominated" in constituency_raw.lower():
                            county_name = "National"
                            constituency_name = None

                        bio = f"Member of Parliament for {constituency_raw}."

                        existing = db.query(Speaker).filter(Speaker.name == name).first()
                        if existing:
                            existing.county_name = county_name
                            existing.constituency_name = constituency_name
                            existing.party = party
                            existing.role = "MP"
                            updated_count += 1
                        else:
                            db.add(Speaker(
                                name=name,
                                county_name=county_name,
                                constituency_name=constituency_name,
                                party=party,
                                role="MP",
                                bio=bio
                            ))
                            added_count += 1

        db.commit()
        print(f"Sync complete. Added: {added_count}, Updated: {updated_count}")
    except Exception as e:
        db.rollback()
        print(f"Error during sync: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    sync_mps()
