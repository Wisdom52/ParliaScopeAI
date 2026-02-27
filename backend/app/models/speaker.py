from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Speaker(Base):
    __tablename__ = "speakers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=True) # e.g., "MP", "Senator", "Speaker"
    constituency_id = Column(Integer, ForeignKey("constituencies.id"), nullable=True)
    county_id = Column(Integer, ForeignKey("counties.id"), nullable=True) # For Senators or identification
    party = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    education = Column(String, nullable=True)
    experience = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    constituency_name = Column(String, nullable=True)  # Direct text storage — no join needed
    county_name = Column(String, nullable=True)
    
    # Performance Stats
    sittings_attended = Column(Integer, default=0)
    votes_cast = Column(Integer, default=0)
    bills_sponsored = Column(Integer, default=0)
    
    # Relationships
    constituency = relationship("Constituency")
    county = relationship("County")
    speech_segments = relationship("SpeechSegment", back_populates="speaker")
    reviews = relationship("RepresentativeReview", back_populates="speaker", cascade="all, delete-orphan")

