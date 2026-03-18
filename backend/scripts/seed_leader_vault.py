from app.database import SessionLocal, engine
from app.models.speaker_vault import SpeakerCredentialVault
from app.core.security import encrypt_pii
from app.core.logger import logger

def seed_leader_vault():
    SpeakerCredentialVault.__table__.drop(engine, checkfirst=True)
    SpeakerCredentialVault.__table__.create(engine)
    db = SessionLocal()
    try:
        # Sample credentials for the first 4 real leaders in the DB
        # Note: In a real system, these would be securely imported from official parliamentary records.
        sample_creds = [
            {"speaker_id": 1, "maisha": "MAISHA-1234", "staff": "STAFF-001"},
            {"speaker_id": 2, "maisha": "MAISHA-5678", "staff": "STAFF-002"},
            {"speaker_id": 3, "maisha": "MAISHA-9012", "staff": "STAFF-003"},
            {"speaker_id": 4, "maisha": "MAISHA-3456", "staff": "STAFF-004"},
        ]

        for cred in sample_creds:
            # Check if already exists
            exists = db.query(SpeakerCredentialVault).filter(SpeakerCredentialVault.speaker_id == cred["speaker_id"]).first()
            if not exists:
                new_entry = SpeakerCredentialVault(
                    speaker_id=cred["speaker_id"],
                    maisha_namba_encrypted=encrypt_pii(cred["maisha"]),
                    staff_id_encrypted=encrypt_pii(cred["staff"])
                )
                db.add(new_entry)
        
        db.commit()
        print("Successfully seeded Speaker Credential Vault with sample data.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding vault: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_leader_vault()
