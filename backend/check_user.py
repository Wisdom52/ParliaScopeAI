from app.database import SessionLocal
from app.models.user import User
import sys

def check_user(email):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"User found: {user.email}")
            print(f"Name: {user.full_name}")
            print(f"Hashed Password: {user.hashed_password}")
            # Do NOT print the actual password obviously, but we can verify if it's set
        else:
            print(f"User NOT found: {email}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_user("yusuf@gmail.com")
