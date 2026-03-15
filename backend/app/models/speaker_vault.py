from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class SpeakerCredentialVault(Base):
    """
    Secure vault mapping parsed Speaker IDs to their hashed Maisha Namba and Staff IDs.
    This is used for the initial 'Two-Factor' claim validation.
    """
    __tablename__ = "speaker_credential_vault"

    id = Column(Integer, primary_key=True, index=True)
    speaker_id = Column(Integer, ForeignKey("speakers.id"), unique=True, nullable=False)
    
    # Stored as hashes for security (SHA-256 or similar)
    maisha_namba_hash = Column(String, nullable=False)
    staff_id_hash = Column(String, nullable=False)

    speaker = relationship("Speaker")
