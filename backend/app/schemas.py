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
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    is_anonymous_default: Optional[bool] = False
    id_number: Optional[str] = None
    county_id: Optional[int] = None
    constituency_id: Optional[int] = None
    county_name: Optional[str] = None
    constituency_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    whatsapp_number: Optional[str] = None
    push_token: Optional[str] = None
    is_admin: Optional[bool] = False
    is_active: Optional[bool] = True
    is_verified: Optional[bool] = False
    role: str = "CITIZEN"
    speaker_id: Optional[int] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    is_anonymous_default: Optional[bool] = None
    id_number: Optional[str] = None
    county_id: Optional[int] = None
    constituency_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    whatsapp_number: Optional[str] = None
    push_token: Optional[str] = None

from datetime import date, datetime
import datetime as dt

class HansardBase(BaseModel):
    title: str
    date: Optional[dt.date] = None
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
    date: Optional[dt.date] = None
    summary: Optional[str] = None
    document_url: Optional[str] = None

class BillCreate(BillBase):
    # Optional field if we want to submit raw text to be verified/summarized
    raw_text: Optional[str] = None

class BillOut(BillBase):
    id: int
    created_at: datetime
    impacts: List[BillImpactOut] = []
    matching_topics: List[str] = [] # User's followed topics that match this bill

    class Config:
        from_attributes = True

class PersonalizedImpact(BaseModel):
    topic: str
    explanation: str
    sentiment: str

# --- Representatives & Reviews ---
class ReviewBase(BaseModel):
    rating: int
    comment: Optional[str] = None

class ReviewCreate(ReviewBase):
    pass

class ReviewOut(ReviewBase):
    id: int
    user_id: int
    speaker_id: int
    created_at: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

class SpeakerBase(BaseModel):
    name: str
    role: str
    party: Optional[str] = None
    constituency_id: Optional[int] = None
    county_id: Optional[int] = None
    bio: Optional[str] = None
    image_url: Optional[str] = None
    sittings_attended: int = 0
    votes_cast: int = 0
    bills_sponsored: int = 0

class SpeakerOut(SpeakerBase):
    id: int
    reviews: List[ReviewOut] = []
    average_rating: float = 0.0
    constituency_name: Optional[str] = None
    county_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- Digital Baraza ---
class BarazaMeetingBase(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    meeting_link: Optional[str] = None
    host_id: Optional[int] = None
    speaker_id: Optional[int] = None
    target_audience: str = "ALL"
    visibility_scope: str = "GLOBAL"
    county_id: Optional[int] = None
    constituency_id: Optional[int] = None
    is_anonymous: Optional[bool] = False

class BarazaMeetingCreate(BarazaMeetingBase):
    pass

class BarazaMeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    meeting_link: Optional[str] = None

class BarazaMeetingOut(BarazaMeetingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class BarazaPollOptionBase(BaseModel):
    text: str

class BarazaPollOptionCreate(BarazaPollOptionBase):
    pass

class BarazaPollOptionOut(BarazaPollOptionBase):
    id: int
    poll_id: int
    vote_count: int = 0

    class Config:
        from_attributes = True

class BarazaPollBase(BaseModel):
    question: str
    poll_type: str = "choice" # choice, checkbox, boolean, text
    expires_at: Optional[datetime] = None
    is_active: bool = True
    target_audience: str = "ALL"
    visibility_scope: str = "GLOBAL"
    county_id: Optional[int] = None
    constituency_id: Optional[int] = None
    is_anonymous: Optional[bool] = False

class BarazaPollCreate(BarazaPollBase):
    options: List[BarazaPollOptionCreate]

class BarazaPollUpdate(BaseModel):
    question: Optional[str] = None
    poll_type: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None

class BarazaPollOut(BarazaPollBase):
    id: int
    creator_id: Optional[int] = None
    created_at: datetime
    options: List[BarazaPollOptionOut]

    class Config:
        from_attributes = True

class BarazaPollVoteCreate(BaseModel):
    poll_id: int
    option_id: int

class BarazaForumCommentBase(BaseModel):
    content: str
    is_anonymous: Optional[bool] = False

class BarazaForumCommentCreate(BarazaForumCommentBase):
    post_id: int

class BarazaForumCommentOut(BarazaForumCommentBase):
    id: int
    post_id: int
    author_id: int
    author_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BarazaForumPostBase(BaseModel):
    title: str
    content: str
    target_audience: str = "ALL"
    visibility_scope: str = "GLOBAL"
    county_id: Optional[int] = None
    constituency_id: Optional[int] = None
    is_anonymous: Optional[bool] = False

class BarazaForumPostCreate(BarazaForumPostBase):
    pass

class BarazaForumPostOut(BarazaForumPostBase):
    id: int
    author_id: int
    author_name: Optional[str] = None
    created_at: datetime
    comments: List[BarazaForumCommentOut] = []

    class Config:
        from_attributes = True

class BarazaLivePulseCreate(BaseModel):
    type: str

class BarazaLivePulseOut(BaseModel):
    id: int
    type: str
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class BarazaLiveChatCreate(BaseModel):
    message: str

class BarazaLiveChatOut(BaseModel):
    id: int
    message: str
    user_id: int
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Civic IQ & Gamification ---
class BarazaQuestionOut(BaseModel):
    id: int
    question_text: str
    options: str # JSON encoded list
    correct_option_index: int

    class Config:
        from_attributes = True

class BarazaQuizOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    icon: Optional[str]
    points_reward: int
    difficulty: str = "beginner"
    source_type: str = "manual"
    questions: List[BarazaQuestionOut] = []

    class Config:
        from_attributes = True

class BarazaUserScoreOut(BaseModel):
    prosperity_points: int

    class Config:
        from_attributes = True

class BarazaBadgeOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    icon_url: Optional[str]

    class Config:
        from_attributes = True

class BarazaGamificationStatus(BaseModel):
    prosperity_points: int
    badges: List[BarazaBadgeOut]

# --- Fact-Shield Verification ---
class FactShieldRequest(BaseModel):
    url: Optional[str] = None
    claim_text: Optional[str] = None

class FactShieldSource(BaseModel):
    id: int
    title: str
    type: str # 'hansard' or 'bill'
    preview: str

class FactShieldResponse(BaseModel):
    status: str # 'Verified', 'Unverified', 'Mixed', 'Inconclusive'
    analysis: str
    explanation: Optional[str] = None
    confidence_score: Optional[int] = None  # 0-100, AI self-reported confidence
    sources: List[FactShieldSource] = []
# --- Stance Analysis ---
class StanceRecord(BaseModel):
    id: int
    topic: str
    stance: str
    analysis: str
    consistency_score: float
    date_recorded: datetime
    evidence_ids: List[int] = []

    class Config:
        from_attributes = True

class StanceAnalysisResponse(BaseModel):
    overall_consistency: float
    summary: str
    topic_breakdown: List[StanceRecord]

# --- Leader Verification ---
class LeaderClaimRequest(BaseModel):
    speaker_id: int
    maisha_namba: str
    staff_id: str
    maisha_card_url: Optional[str] = None
    staff_card_url: Optional[str] = None
