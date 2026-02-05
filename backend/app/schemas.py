from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: Optional[EmailStr] = None

class UserCreate(UserBase):
    password: Optional[str] = None
    county_id: Optional[int] = None
    ward_id: Optional[int] = None

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
    county_id: Optional[int]
    ward_id: Optional[int]

    class Config:
        from_attributes = True
