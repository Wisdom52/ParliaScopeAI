from app.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def create_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin_email = "yusufAdmin@gmail.com"
        admin_pass = "yusufAdmin123456"
        
        db_admin = db.query(User).filter(User.email == admin_email).first()
        if db_admin:
            print(f"Admin user {admin_email} already exists.")
            # Ensure it has admin rights
            if not db_admin.is_admin:
                db_admin.is_admin = True
                db.commit()
                print("Updated existing user to Admin status.")
            return

        # Create new admin
        hashed_password = get_password_hash(admin_pass)
        new_admin = User(
            email=admin_email,
            hashed_password=hashed_password,
            full_name="System Administrator",
            is_admin=True
        )
        db.add(new_admin)
        db.commit()
        print(f"Admin user {admin_email} created successfully.")
        
    except Exception as e:
        print(f"Error creating admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
