from pydantic import BaseModel, EmailStr
from typing import Optional, List

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
    whatsapp_number: Optional[str] = None
    push_token: Optional[str] = None

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
    constituency_name: Optional[str] = None
    latitude: Optional[float]
    longitude: Optional[float]
    whatsapp_number: Optional[str] = None
    push_token: Optional[str] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    id_number: Optional[str] = None
    county_id: Optional[int] = None
    constituency_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    whatsapp_number: Optional[str] = None
    push_token: Optional[str] = None

from datetime import date, datetime

class HansardBase(BaseModel):
    title: str
    date: Optional[date] = None
    pdf_url: Optional[str] = None
    ai_summary: Optional[str] = None

class HansardCreate(HansardBase):
    pass

class Hansard(HansardBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Subscriptions ---
class SubscriptionBase(BaseModel):
    topic: Optional[str] = None
    speaker_id: Optional[int] = None

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionOut(SubscriptionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Bills and Impacts ---
class BillImpactBase(BaseModel):
    archetype: str
    description: str
    sentiment: str

class BillImpactCreate(BillImpactBase):
    pass

class BillImpactOut(BillImpactBase):
    id: int
    bill_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class BillBase(BaseModel):
    title: str
    summary: Optional[str] = None
    document_url: Optional[str] = None

class BillCreate(BillBase):
    # Optional field if we want to submit raw text to be verified/summarized
    raw_text: Optional[str] = None

class BillOut(BillBase):
    id: int
    created_at: datetime
    impacts: List[BillImpactOut] = []

    class Config:
        from_attributes = True
