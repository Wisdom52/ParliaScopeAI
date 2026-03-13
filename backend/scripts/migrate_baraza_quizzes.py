import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine
from sqlalchemy import text

def migrate():
    print("MIGRATE: Adding columns to baraza_quizzes table...")
    with engine.connect() as conn:
        # difficulty
        try:
            conn.execute(text('ALTER TABLE baraza_quizzes ADD COLUMN difficulty VARCHAR DEFAULT \'beginner\''))
            print("  - Added column: difficulty")
        except Exception as e:
            print(f"  - Column 'difficulty' already exists or failed: {e}")

        # source_type
        try:
            conn.execute(text('ALTER TABLE baraza_quizzes ADD COLUMN source_type VARCHAR DEFAULT \'manual\''))
            print("  - Added column: source_type")
        except Exception as e:
            print(f"  - Column 'source_type' already exists or failed: {e}")

        # generated_date
        try:
            conn.execute(text('ALTER TABLE baraza_quizzes ADD COLUMN generated_date DATE'))
            print("  - Added column: generated_date")
        except Exception as e:
            print(f"  - Column 'generated_date' already exists or failed: {e}")

        conn.commit()
    print("MIGRATE: Done.")

if __name__ == "__main__":
    migrate()
