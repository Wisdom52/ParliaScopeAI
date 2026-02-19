from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class County(Base):
    __tablename__ = "counties"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    constituencies = relationship("Constituency", back_populates="county")

class Constituency(Base):
    __tablename__ = "constituencies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    county_id = Column(Integer, ForeignKey("counties.id"))
    county = relationship("County", back_populates="constituencies")
