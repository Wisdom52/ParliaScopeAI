from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/parliascope")
engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        print("Adding missing columns to 'users' table...")
        
        # Add columns one by one if they don't exist
        columns = [
            ("role", "VARCHAR DEFAULT 'CITIZEN'"),
            ("is_verified", "BOOLEAN DEFAULT FALSE"),
            ("speaker_id", "INTEGER"),
            ("is_active", "BOOLEAN DEFAULT TRUE")
        ]
        
        for col_name, col_type in columns:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type};"))
                print(f"Added column: {col_name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"Column '{col_name}' already exists, skipping.")
                else:
                    print(f"Error adding '{col_name}': {e}")
        
        # Add foreign key constraint if possible
        try:
            conn.execute(text("ALTER TABLE users ADD CONSTRAINT fk_speaker FOREIGN KEY (speaker_id) REFERENCES speakers (id);"))
            print("Added foreign key constraint for speaker_id.")
        except Exception as e:
            print(f"Note: Could not add FK constraint (maybe speakers table isn't ready or constraint exists): {e}")

        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
