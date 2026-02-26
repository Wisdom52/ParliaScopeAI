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
from app.core.security import verify_password

def audit_users():
    db = SessionLocal()
    try:
        print("--- User Database Audit ---")
        users = db.query(User).all()
        print(f"Total Users Found: {len(users)}")
        
        target_email = "yusuf@gmail.com"
        target_found = False
        
        for u in users:
            print(f"- Email: {u.email} | Name: {u.full_name} | Password Set: {'Yes' if u.hashed_password else 'No'}")
            if u.email == target_email:
                target_found = True
                if u.hashed_password:
                    match = verify_password("123456", u.hashed_password)
                    print(f"  >>> TARGET MATCH (yusuf@gmail.com with 123456): {match}")
                else:
                    print("  >>> TARGET MATCH (yusuf@gmail.com): NO PASSWORD STORED")
        
        if not target_found:
            print(f"\nRESULT: User '{target_email}' NOT FOUND.")
            if users:
                print(f"SUGGESTION: Try one of the above existing users or sign up a new account.")
            else:
                print("SUGGESTION: Database is empty. Please sign up first.")
                
    except Exception as e:
        print(f"ERROR: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    audit_users()
