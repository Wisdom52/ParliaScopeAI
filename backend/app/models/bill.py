from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    summary = Column(Text, nullable=True)
    document_url = Column(String, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    impacts = relationship("BillImpact", back_populates="bill", cascade="all, delete-orphan")

class BillImpact(Base):
    __tablename__ = "bill_impacts"

    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(Integer, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False, index=True)
    
    archetype = Column(String, index=True, nullable=False) # e.g., 'SME', 'Student', 'Farmer'
    description = Column(Text, nullable=False)
    sentiment = Column(String, nullable=False) # e.g., 'Positive', 'Negative', 'Neutral'
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    bill = relationship("Bill", back_populates="impacts")
