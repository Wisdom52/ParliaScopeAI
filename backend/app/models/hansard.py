from sqlalchemy import Column, Integer, String, Text, Date, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Hansard(Base):
    __tablename__ = "hansards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    date = Column(Date, nullable=True)
    pdf_url = Column(String, nullable=True)
    source_id = Column(String, unique=True, index=True, nullable=True) # e.g., a slug of the URL or internal ID
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    speech_segments = relationship("SpeechSegment", back_populates="hansard")
