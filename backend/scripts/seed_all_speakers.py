import sys
import os
import random
from datetime import datetime, timedelta

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.speaker import Speaker
from app.models.representative_review import RepresentativeReview
from app.models.user import User

def seed_all_speakers():
    db = SessionLocal()
    
    print("Fetching all speakers...")
    speakers = db.query(Speaker).all()
    
    print(f"Found {len(speakers)} speakers. Generating mock data...")
    
    # Generic reviews to rotate through
    mock_reviews = [
        "He has been very active in our local community projects.",
        "I like the recent road expansion, but education still needs work.",
        "Not seen much representation since the election.",
        "Excellent leadership in parliament.",
        "They always attend the sittings but rarely sponsor bills.",
        "We need more transparency on the CDF allocation.",
        "A true champion for youth empowerment.",
        "They are trying, but the economy is making things difficult."
    ]
    
    # Find some generic citizens to associate the reviews with
    citizens = db.query(User).filter(User.role == 'CITIZEN').limit(5).all()
    citizen_ids = [c.id for c in citizens]
    if not citizen_ids:
        print("No citizens found! Please run regular seed scripts first if you want reviews attached to real users.")
        # Proceed anyway with mock generic IDs if needed, but safer to skip reviews if no users
        citizen_ids = [1, 2, 3] # Fallback dummy IDs
    
    updated_count = 0
    review_count = 0

    for speaker in speakers:
        # 1. Add mock Sittings and Bills (if they currently have 0 or very low)
        if speaker.sittings_attended == 0 and speaker.bills_sponsored == 0:
            speaker.sittings_attended = random.randint(15, 65)
            speaker.bills_sponsored = random.randint(0, 8)
            speaker.votes_cast = random.randint(10, 50)
            updated_count += 1
        
        # 2. Add some random reviews (if they have none)
        existing_reviews = db.query(RepresentativeReview).filter(RepresentativeReview.speaker_id == speaker.id).count()
        if existing_reviews == 0:
            num_reviews = random.randint(1, 4)
            for _ in range(num_reviews):
                review = RepresentativeReview(
                    speaker_id=speaker.id,
                    user_id=random.choice(citizen_ids),
                    rating=random.randint(2, 5),
                    comment=random.choice(mock_reviews),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 60))
                )
                db.add(review)
                review_count += 1
                
    db.commit()
    print(f"\nSuccessfully updated {updated_count} Speakers with mock sittings/bills.")
    print(f"Successfully added {review_count} new mock reviews across the speakers.")
    print("\nAll Leader Dashboards will now exactly mirror the Representatives Page data!")

if __name__ == "__main__":
    seed_all_speakers()
