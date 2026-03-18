from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, DateTime, Boolean, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class BarazaMeeting(Base):
    __tablename__ = "baraza_meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    meeting_link = Column(String, nullable=True)
    # host_id can be a User ID who is a leader, or linked to a Speaker
    host_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    speaker_id = Column(Integer, ForeignKey("speakers.id"), nullable=True)
    is_anonymous = Column(Boolean, default=False)
    
    # Granular Controls
    target_audience = Column(String, default="ALL") # ALL, LEADERS, CITIZENS
    visibility_scope = Column(String, default="GLOBAL") # GLOBAL, REGIONAL
    county_id = Column(Integer, ForeignKey("counties.id"), nullable=True)
    constituency_id = Column(Integer, ForeignKey("constituencies.id"), nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    host = relationship("User")
    speaker = relationship("Speaker")

class BarazaPoll(Base):
    __tablename__ = "baraza_polls"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String, nullable=False)
    poll_type = Column(String, default="choice") # choice, checkbox, boolean, text
    expires_at = Column(DateTime(timezone=True), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    is_anonymous = Column(Boolean, default=False)
    
    # Granular Controls
    target_audience = Column(String, default="ALL") # ALL, LEADERS, CITIZENS
    visibility_scope = Column(String, default="GLOBAL") # GLOBAL, REGIONAL
    county_id = Column(Integer, ForeignKey("counties.id"), nullable=True)
    constituency_id = Column(Integer, ForeignKey("constituencies.id"), nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    options = relationship("BarazaPollOption", back_populates="poll", cascade="all, delete-orphan")
    creator = relationship("User")

class BarazaPollOption(Base):
    __tablename__ = "baraza_poll_options"

    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("baraza_polls.id", ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=False)

    poll = relationship("BarazaPoll", back_populates="options")
    votes = relationship("BarazaPollVote", back_populates="option", cascade="all, delete-orphan")

class BarazaPollVote(Base):
    __tablename__ = "baraza_poll_votes"

    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("baraza_polls.id", ondelete="CASCADE"), nullable=False)
    option_id = Column(Integer, ForeignKey("baraza_poll_options.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    option = relationship("BarazaPollOption", back_populates="votes")
    user = relationship("User")

class BarazaForumPost(Base):
    __tablename__ = "baraza_forum_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_anonymous = Column(Boolean, default=False)
    
    # Granular Controls
    target_audience = Column(String, default="ALL") # ALL, LEADERS, CITIZENS
    visibility_scope = Column(String, default="GLOBAL") # GLOBAL, REGIONAL
    county_id = Column(Integer, ForeignKey("counties.id"), nullable=True)
    constituency_id = Column(Integer, ForeignKey("constituencies.id"), nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    author = relationship("User")
    comments = relationship("BarazaForumComment", back_populates="post", cascade="all, delete-orphan")

class BarazaForumComment(Base):
    __tablename__ = "baraza_forum_comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("baraza_forum_posts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_anonymous = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    post = relationship("BarazaForumPost", back_populates="comments")
    author = relationship("User")

class BarazaLivePulse(Base):
    __tablename__ = "baraza_live_pulse"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False) # e.g., 'fire', 'clap', 'angry', 'love'
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User")

class BarazaLiveChat(Base):
    __tablename__ = "baraza_live_chats"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User")

class BarazaQuiz(Base):
    __tablename__ = "baraza_quizzes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True) # e.g., Lucide icon name
    points_reward = Column(Integer, default=10)
    difficulty = Column(String, default="beginner")  # beginner, intermediate, advanced
    source_type = Column(String, default="manual")   # manual, ai_generated
    generated_date = Column(Date, nullable=True)     # date quiz was generated (for daily refresh)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    questions = relationship("BarazaQuestion", back_populates="quiz", cascade="all, delete-orphan")

class BarazaQuestion(Base):
    __tablename__ = "baraza_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("baraza_quizzes.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(Text, nullable=False) # JSON string of options
    correct_option_index = Column(Integer, nullable=False)

    quiz = relationship("BarazaQuiz", back_populates="questions")

class BarazaUserScore(Base):
    __tablename__ = "baraza_user_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    prosperity_points = Column(Integer, default=0)
    last_updated = Column(TIMESTAMP(timezone=True), onupdate=func.now())

    user = relationship("User")

class BarazaBadge(Base):
    __tablename__ = "baraza_badges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String, nullable=True)
    requirement_type = Column(String, nullable=False) # e.g., 'quizzes_completed', 'points_total'
    requirement_value = Column(Integer, nullable=False)

class BarazaUserBadge(Base):
    __tablename__ = "baraza_user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    badge_id = Column(Integer, ForeignKey("baraza_badges.id", ondelete="CASCADE"), nullable=False)
    earned_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User")
    badge = relationship("BarazaBadge")
