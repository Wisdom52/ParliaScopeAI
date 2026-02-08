from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Speaker(Base):
    __tablename__ = "speakers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=True) # e.g., "MP", "Senator", "Speaker"
    constituency_id = Column(Integer, ForeignKey("constituencies.id"), nullable=True)
    party = Column(String, nullable=True)
    
    # Relationships
    constituency = relationship("Constituency")
    speech_segments = relationship("SpeechSegment", back_populates="speaker")
