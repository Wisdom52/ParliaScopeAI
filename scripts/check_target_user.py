import os
import sys

# Add the backend directory to sys.path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.database import SessionLocal
from app.models.user import User
from app.models.location import County, Constituency
from app.models.subscription import Subscription
from app.core.security import verify_password

def check_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "yusuf@gmail.com").first()
        if user:
            print(f"USER_FOUND: True")
            print(f"EMAIL: {user.email}")
            if user.hashed_password:
                is_correct = verify_password("123456", user.hashed_password)
                print(f"PASSWORD_MATCH: {is_correct}")
            else:
                print("PASSWORD_MATCH: No hashed password stored for this user.")
        else:
            print("USER_FOUND: False")
            print("MESSAGE: User 'yusuf@gmail.com' not found in the database.")
    except Exception as e:
        print(f"ERROR: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    check_user()
