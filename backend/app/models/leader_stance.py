from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, JSON, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class LeaderStance(Base):
    __tablename__ = "leader_stances"

    id = Column(Integer, primary_key=True, index=True)
    speaker_id = Column(Integer, ForeignKey("speakers.id"), index=True)
    topic = Column(String, index=True)
    stance = Column(String)  # e.g., "Supportive", "Opposed", "Neutral"
    analysis = Column(Text)
    consistency_score = Column(Float, default=100.0)
    date_recorded = Column(TIMESTAMP(timezone=True), server_default=func.now())
    evidence_ids = Column(JSON)  # List of SpeechSegment IDs or Bill IDs

    speaker = relationship("Speaker")
