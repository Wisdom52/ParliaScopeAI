from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True) # Nullable for lazy auth initially? Or strict 
    # The requirement says "Lazy-authentication". Usually means guest user first or silent signup.
    # We will make email nullable for now to support "guest" or "device-id" based accounts if needed, 
    # but the deliverables say "Users can sign up/in". Let's assume standard email/password for the profile setup.
    # Actually "Lazy-authentication module" usually implies creating a user without credentials first.
    # Let's keep email nullable just in case, or stick to the specific "sign up/in" success criteria.
    # "Users can sign up/in - profile correctly stores and recalls County/Ward data."
    # Let's check the plan: "Implement /signup (lazy/full)".
    
    hashed_password = Column(String, nullable=True)
    county_id = Column(Integer, ForeignKey("counties.id"), nullable=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)

    county = relationship("County")
    ward = relationship("Ward")
