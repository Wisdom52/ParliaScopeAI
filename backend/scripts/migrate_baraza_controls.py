import sys
import os

# Add the backend directory to the sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import text
from app.database import engine

def migrate():
    tables = ["baraza_meetings", "baraza_polls", "baraza_forum_posts"]
    
    with engine.connect() as conn:
        for table in tables:
            print(f"Migrating table: {table}")
            try:
                # Add target_audience
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS target_audience VARCHAR DEFAULT 'ALL'"))
                # Add visibility_scope
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS visibility_scope VARCHAR DEFAULT 'GLOBAL'"))
                # Add county_id
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS county_id INTEGER REFERENCES counties(id)"))
                # Add constituency_id
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS constituency_id INTEGER REFERENCES constituencies(id)"))
                conn.commit()
                print(f"Successfully migrated {table}")
            except Exception as e:
                print(f"Error migrating {table}: {e}")
                conn.rollback()

if __name__ == "__main__":
    migrate()
