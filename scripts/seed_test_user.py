import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.database import SessionLocal
from app.models.user import User
from app.models.location import County, Constituency
from app.models.subscription import Subscription
from app.models.bill import Bill, BillImpact
from app.models.hansard import Hansard
from app.models.speaker import Speaker
from app.models.speech import SpeechSegment
from app.models.search_history import SearchHistory
from app.core.security import get_password_hash

def seed_user():
    db = SessionLocal()
    try:
        email = "yusuf@gmail.com"
        password = "123456"
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"User {email} already exists. Updating password...")
            user.hashed_password = get_password_hash(password)
        else:
            print(f"Creating user {email}...")
            user = User(
                email=email,
                hashed_password=get_password_hash(password),
                full_name="Yusuf Test",
            )
            db.add(user)
        
        db.commit()
        print(f"Successfully seeded user {email} with password {password}")
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_user()
