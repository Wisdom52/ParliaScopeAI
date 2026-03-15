from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class LeaderVerificationRequest(Base):
    """
    Stores pending and historical requests from users claiming to be parliamentary leaders.
    Includes paths to uploaded ID photos for manual admin review.
    """
    __tablename__ = "leader_verification_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    speaker_id = Column(Integer, ForeignKey("speakers.id"), nullable=False)
    
    # PENDING, APPROVED, REJECTED, VOID
    status = Column(String, default="PENDING")
    
    # File paths for manual review
    maisha_card_url = Column(String, nullable=True)
    staff_card_url = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    admin_notes = Column(String, nullable=True)

    user = relationship("User")
    speaker = relationship("Speaker")
