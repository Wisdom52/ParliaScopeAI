from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.database import Base

class SpeechSegment(Base):
    __tablename__ = "speech_segments"
    id = Column(Integer, primary_key=True, index=True)
    hansard_id = Column(Integer, index=True)
    speaker_name = Column(String, index=True)
    content = Column(Text, nullable=False)
    # 768 is the standard dimension for many models like all-mpnet-base-v2
    embedding = Column(Vector(768)) 
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
