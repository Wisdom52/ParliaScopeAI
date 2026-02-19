from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: Optional[EmailStr] = None

class UserCreate(UserBase):
    password: Optional[str] = None
    full_name: Optional[str] = None
    id_number: Optional[str] = None
    county_id: Optional[int] = None
    constituency_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        extra = "ignore"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class User(UserBase):
    id: int
    full_name: Optional[str]
    id_number: Optional[str]
    county_id: Optional[int]
    constituency_id: Optional[int]
    county_name: Optional[str] = None
    constituency_name: Optional[str] = None
    latitude: Optional[float]
    longitude: Optional[float]

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    id_number: Optional[str] = None
    county_id: Optional[int] = None
    constituency_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

from datetime import date, datetime

class HansardBase(BaseModel):
    title: str
    date: Optional[date] = None
    pdf_url: Optional[str] = None

class HansardCreate(HansardBase):
    pass

class Hansard(HansardBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
