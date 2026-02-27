import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.database import SessionLocal, engine
from app.models.user import User
from app.models.location import County, Constituency
from app.models.speaker import Speaker
from app.models.representative_review import RepresentativeReview
from app.models.subscription import Subscription
from app.models.bill import Bill, BillImpact
from app.models.hansard import Hansard
from app.models.speech import SpeechSegment
from app.models.search_history import SearchHistory
from app.services.member_scraper import get_all_representatives
import random
from sqlalchemy import text

def add_column_safely(column_def):
    with engine.connect() as conn:
        try:
            conn.execute(text(f"ALTER TABLE speakers ADD COLUMN IF NOT EXISTS {column_def}"))
            conn.commit()
            print(f"Ensured column: {column_def}")
        except Exception as e:
            print(f"Skipped column {column_def} (likely already exists or failed): {e}")

def seed_representatives():
    db = SessionLocal()
    try:
        print("Ensuring database schema is updated...")
        from app.database import Base
        Base.metadata.create_all(bind=engine)
        
        # Add columns individually for robustness in Postgres
        cols_to_add = [
            "county_id INTEGER REFERENCES counties(id)",
            "bio TEXT",
            "education TEXT",
            "experience TEXT",
            "image_url TEXT",
            "sittings_attended INTEGER DEFAULT 0",
            "votes_cast INTEGER DEFAULT 0",
            "bills_sponsored INTEGER DEFAULT 0"
        ]
        for col in cols_to_add:
            add_column_safely(col)

        print("Fetching representatives from scraper...")
        reps = get_all_representatives()
        print(f"Found {len(reps)} representatives.")
        
        counties_db = db.query(County).all()
        constituencies_db = db.query(Constituency).all()
        
        counties = {c.name.lower(): c.id for c in counties_db}
        constituencies = {c.name.lower(): c.id for c in constituencies_db}
        
        added_count = 0
        updated_count = 0
        for rep in reps:
            # Check if exists
            existing = db.query(Speaker).filter(Speaker.name == rep['name']).first()
            
            const_name = rep.get('constituency', '') or ''
            county_name = rep.get('county', '') or ''
            
            # Semi-realistic stats for attendance (since we don't scrape that yet)
            sittings = random.randint(10, 50)
            votes = random.randint(5, 30)
            
            if existing:
                existing.role = rep['role']
                existing.party = rep['party']
                existing.constituency_name = const_name if const_name else existing.constituency_name
                existing.county_name = county_name if county_name else existing.county_name
                existing.bio = rep.get('bio', existing.bio)
                existing.education = rep.get('education', existing.education)
                existing.experience = rep.get('experience', existing.experience)
                existing.bills_sponsored = rep.get('bills_sponsored', existing.bills_sponsored)
                existing.image_url = rep.get('image_url', existing.image_url)
                updated_count += 1
            else:
                new_rep = Speaker(
                    name=rep['name'],
                    role=rep['role'],
                    party=rep['party'],
                    constituency_name=const_name,
                    county_name=county_name,
                    bio=rep.get('bio', ""),
                    education=rep.get('education', ""),
                    experience=rep.get('experience', ""),
                    sittings_attended=sittings,
                    votes_cast=votes,
                    bills_sponsored=rep.get('bills_sponsored', 0),
                    image_url=rep.get('image_url', "")
                )
                db.add(new_rep)
                added_count += 1
            
        db.commit()
        print(f"Done! Added {added_count}, Updated {updated_count} representatives.")
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_representatives()
