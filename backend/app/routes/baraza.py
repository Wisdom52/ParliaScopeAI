from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.baraza import (
    BarazaMeeting, BarazaPoll, BarazaPollOption, BarazaPollVote, 
    BarazaForumPost, BarazaForumComment, BarazaLivePulse, BarazaLiveChat,
    BarazaQuiz, BarazaQuestion, BarazaUserScore, BarazaBadge, BarazaUserBadge
)
from app.models.user import User
from app.schemas import (
    BarazaMeetingCreate, BarazaMeetingOut, BarazaMeetingUpdate,
    BarazaPollCreate, BarazaPollOut, BarazaPollVoteCreate, BarazaPollUpdate,
    BarazaForumPostCreate, BarazaForumPostOut,
    BarazaForumCommentCreate, BarazaForumCommentOut,
    BarazaUserScoreOut, BarazaBadgeOut,
    BarazaLivePulseCreate, BarazaLivePulseOut,
    BarazaLiveChatCreate, BarazaLiveChatOut,
    BarazaQuizOut, BarazaGamificationStatus, OfficialResponseCreate
)
from app.routes.auth import get_current_user, get_current_user_optional
from app.core.moderation import check_profanity, is_spam
from app.core.security_utils import get_notification_trigger
from app.services.quiz_generator import generate_ai_quiz, should_generate_quiz_today
from datetime import datetime, timedelta, date, timezone
import json

router = APIRouter(prefix="/baraza", tags=["Digital Baraza"])

# --- Meetings ---
@router.get("/meetings", response_model=List[BarazaMeetingOut])
def get_meetings(current_user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    from datetime import timedelta
    two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
    query = db.query(BarazaMeeting).filter(BarazaMeeting.scheduled_at >= two_hours_ago)
    
    # Audience Filter
    if current_user:
        if current_user.role == "LEADER":
            query = query.filter(BarazaMeeting.target_audience.in_(["ALL", "LEADERS"]))
        else:
            query = query.filter(BarazaMeeting.target_audience.in_(["ALL", "CITIZENS"]))
            
        # Regional Filter
        # Show GLOBAL ones, or REGIONAL ones that match user's location
        from sqlalchemy import or_
        query = query.filter(or_(
            BarazaMeeting.visibility_scope == "GLOBAL",
            (BarazaMeeting.visibility_scope == "REGIONAL") & 
            (BarazaMeeting.county_id == current_user.county_id) & 
            ((BarazaMeeting.constituency_id == None) | (BarazaMeeting.constituency_id == current_user.constituency_id))
        ))
    else:
        # Public view: only show ALL/GLOBAL
        query = query.filter(BarazaMeeting.target_audience == "ALL", BarazaMeeting.visibility_scope == "GLOBAL")

    return query.order_by(BarazaMeeting.scheduled_at.asc()).all()

@router.post("/meetings", response_model=BarazaMeetingOut)
def create_meeting(
    meeting: BarazaMeetingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meeting_data = meeting.dict()
    meeting_data["host_id"] = current_user.id
    
    # Auto-fill location if regional and not specified
    if meeting_data.get("visibility_scope") == "REGIONAL":
        if not meeting_data.get("county_id"):
            meeting_data["county_id"] = current_user.county_id
        if not meeting_data.get("constituency_id"):
            meeting_data["constituency_id"] = current_user.constituency_id
            
    # Default to user's anonymous preference if not explicitly set
    if "is_anonymous" not in meeting_data:
        meeting_data["is_anonymous"] = current_user.is_anonymous_default
            
    db_meeting = BarazaMeeting(**meeting_data)
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting

@router.put("/meetings/{meeting_id}", response_model=BarazaMeetingOut)
def update_meeting(
    meeting_id: int,
    meeting_update: BarazaMeetingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_meeting = db.query(BarazaMeeting).filter(BarazaMeeting.id == meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if db_meeting.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this meeting")
    
    update_data = meeting_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_meeting, key, value)
    
    db.commit()
    db.refresh(db_meeting)
    return db_meeting

@router.delete("/meetings/{meeting_id}")
def delete_meeting(
    meeting_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_meeting = db.query(BarazaMeeting).filter(BarazaMeeting.id == meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if db_meeting.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this meeting")
    
    db.delete(db_meeting)
    db.commit()
    return {"status": "success", "message": "Meeting deleted"}

# --- Polls ---
@router.get("/polls", response_model=List[BarazaPollOut])
def get_polls(current_user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    query = db.query(BarazaPoll)
    
    # Audience Filter
    if current_user:
        if current_user.role == "LEADER":
            query = query.filter(BarazaPoll.target_audience.in_(["ALL", "LEADERS"]))
        else:
            query = query.filter(BarazaPoll.target_audience.in_(["ALL", "CITIZENS"]))
            
        # Regional Filter
        from sqlalchemy import or_
        query = query.filter(or_(
            BarazaPoll.visibility_scope == "GLOBAL",
            (BarazaPoll.visibility_scope == "REGIONAL") & 
            (BarazaPoll.county_id == current_user.county_id) & 
            ((BarazaPoll.constituency_id == None) | (BarazaPoll.constituency_id == current_user.constituency_id))
        ))
    else:
        query = query.filter(BarazaPoll.target_audience == "ALL", BarazaPoll.visibility_scope == "GLOBAL")
        
    polls = query.order_by(BarazaPoll.created_at.desc()).all()
    # Add vote counts to options
    for poll in polls:
        for option in poll.options:
            option.vote_count = db.query(BarazaPollVote).filter(
                BarazaPollVote.option_id == option.id
            ).count()
    return polls

@router.post("/polls", response_model=BarazaPollOut)
def create_poll(
    poll: BarazaPollCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    poll_data = poll.dict()
    options_data = poll_data.pop("options")
    poll_data["creator_id"] = current_user.id
    
    # Auto-fill location if regional and not specified
    if poll_data.get("visibility_scope") == "REGIONAL":
        if not poll_data.get("county_id"):
            poll_data["county_id"] = current_user.county_id
        if not poll_data.get("constituency_id"):
            poll_data["constituency_id"] = current_user.constituency_id
            
    # Default to user's anonymous preference if not explicitly set
    if "is_anonymous" not in poll_data:
        poll_data["is_anonymous"] = current_user.is_anonymous_default
            
    db_poll = BarazaPoll(**poll_data)
    db.add(db_poll)
    db.commit()
    db.refresh(db_poll)
    
    for opt in options_data:
        db_opt = BarazaPollOption(poll_id=db_poll.id, text=opt["text"])
        db.add(db_opt)
    
    db.commit()
    db.refresh(db_poll)
    return db_poll

@router.delete("/polls/{poll_id}")
def delete_poll(
    poll_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_poll = db.query(BarazaPoll).filter(BarazaPoll.id == poll_id).first()
    if not db_poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    # Participation Check (for deletion, not participation)
    # This check ensures that only users who could potentially participate (or are leaders) can delete.
    # However, the primary check for deletion is creator_id.
    # The instruction seems to imply a target_audience check for *participation* in the context of deletion,
    # which is unusual. Assuming the intent is to ensure the user is authorized based on the poll's audience
    # *if* they were to interact with it, or if the poll is restricted.
    # The original instruction snippet was for a forum post and had `db_post` and `post_id`.
    # Adapting it to `db_poll` and `poll_id` for consistency with the provided snippet's location.
    if db_poll.target_audience == "LEADERS" and current_user.role != "LEADER":
        raise HTTPException(status_code=403, detail="Only leaders can delete polls targeted at leaders")
    if db_poll.target_audience == "CITIZENS" and current_user.role != "CITIZEN":
        raise HTTPException(status_code=403, detail="Only citizens can delete polls targeted at citizens")

    if db_poll.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this poll")
    
    db.delete(db_poll)
    db.commit()
    return {"status": "success", "message": "Poll deleted"}

@router.post("/polls/vote", response_model=BarazaPollOut)
def vote_poll(
    vote: BarazaPollVoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_poll = db.query(BarazaPoll).filter(BarazaPoll.id == vote.poll_id).first()
    if not db_poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    # Participation Check
    if db_poll.target_audience == "LEADERS" and current_user.role != "LEADER":
        raise HTTPException(status_code=403, detail="Only leaders can participate in this poll")
    if db_poll.target_audience == "CITIZENS" and current_user.role != "CITIZEN":
        raise HTTPException(status_code=403, detail="Only citizens can participate in this poll")

    # Check expiration
    if db_poll.expires_at and db_poll.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This poll has expired")

    # Check if user already voted in this poll
    existing_vote = db.query(BarazaPollVote).filter(
        BarazaPollVote.poll_id == vote.poll_id,
        BarazaPollVote.user_id == current_user.id
    ).first()
    
    if existing_vote:
        raise HTTPException(status_code=400, detail="User already voted in this poll")
    
    db_vote = BarazaPollVote(
        poll_id=vote.poll_id,
        option_id=vote.option_id,
        user_id=current_user.id
    )
    db.add(db_vote)
    db.commit()
    
    # Return updated poll with vote counts
    db.refresh(db_poll)
    for option in db_poll.options:
        option.vote_count = db.query(BarazaPollVote).filter(
            BarazaPollVote.option_id == option.id
        ).count()
    return db_poll

# --- Forum ---
@router.get("/forum", response_model=List[BarazaForumPostOut])
def get_forum_posts(current_user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    query = db.query(BarazaForumPost)
    
    if current_user:
        if current_user.role == "LEADER":
            query = query.filter(BarazaForumPost.target_audience.in_(["ALL", "LEADERS"]))
        else:
            query = query.filter(BarazaForumPost.target_audience.in_(["ALL", "CITIZENS"]))
            
        from sqlalchemy import or_
        query = query.filter(or_(
            BarazaForumPost.visibility_scope == "GLOBAL",
            (BarazaForumPost.visibility_scope == "REGIONAL") & 
            (BarazaForumPost.county_id == current_user.county_id) & 
            ((BarazaForumPost.constituency_id == None) | (BarazaForumPost.constituency_id == current_user.constituency_id))
        ))
    else:
        query = query.filter(BarazaForumPost.target_audience == "ALL", BarazaForumPost.visibility_scope == "GLOBAL")
        
    posts = query.order_by(BarazaForumPost.created_at.desc()).all()
    # Add author name
    for post in posts:
        is_admin = current_user is not None and current_user.is_admin
        if post.is_anonymous and not is_admin:
            post.author_name = "Anonymous Citizen"
        else:
            post.author_name = (post.author.display_name or post.author.full_name) if post.author else "Citizen"
    return posts

@router.post("/forum", response_model=BarazaForumPostOut)
def create_forum_post(
    post: BarazaForumPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    is_anon = post.is_anonymous if post.is_anonymous is not None else current_user.is_anonymous_default
    
    db_post = BarazaForumPost(
        title=post.title,
        content=post.content,
        author_id=current_user.id,
        is_anonymous=is_anon,
        target_audience=post.target_audience,
        visibility_scope=post.visibility_scope,
        county_id=post.county_id or (current_user.county_id if post.visibility_scope == "REGIONAL" else None),
        constituency_id=post.constituency_id or (current_user.constituency_id if post.visibility_scope == "REGIONAL" else None)
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    is_admin = current_user is not None and current_user.is_admin
    db_post.author_name = "Anonymous Citizen" if (db_post.is_anonymous and not is_admin) else (current_user.display_name or current_user.full_name)
    return db_post

@router.post("/forum/comments", response_model=BarazaForumCommentOut)
def create_comment(
    comment: BarazaForumCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    is_anon = comment.is_anonymous if comment.is_anonymous is not None else current_user.is_anonymous_default
    
    db_comment = BarazaForumComment(
        post_id=comment.post_id,
        author_id=current_user.id,
        content=comment.content,
        is_anonymous=is_anon
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    is_admin = current_user is not None and current_user.is_admin
    db_comment.author_name = "Anonymous Citizen" if (db_comment.is_anonymous and not is_admin) else (current_user.display_name or current_user.full_name)
    return db_comment

# --- Live Pulse ---
@router.get("/live/stream")
def get_live_stream():
    # Official Kenyan Parliament Channel ID: UCXuseB7juWB7DIgTJcwtHFQ
    return {
        "channel_id": "UCXuseB7juWB7DIgTJcwtHFQ",
        "type": "channel_live"
    }

@router.post("/live/pulse", response_model=BarazaLivePulseOut)
def record_pulse(
    pulse: BarazaLivePulseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_pulse = BarazaLivePulse(
        type=pulse.type,
        user_id=current_user.id
    )
    db.add(db_pulse)
    db.commit()
    db.refresh(db_pulse)
    return db_pulse

@router.get("/live/pulse/stats")
async def get_pulse_stats(db: Session = Depends(get_db)):
    # Simple all-time count for now
    results = db.query(BarazaLivePulse.type, func.count(BarazaLivePulse.id)).group_by(BarazaLivePulse.type).all()
    return {r[0]: r[1] for r in results}

@router.get("/live/pulse/analytics")
def get_pulse_analytics(
    county_id: Optional[int] = None,
    constituency_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    # Map pulse types to support levels
    weight_map = {
        'fire': 100,
        'love': 100,
        'clap': 75,
        'sad': 25,
        'angry': 0
    }
    
    query = db.query(BarazaLivePulse).join(User)
    if county_id:
        query = query.filter(User.county_id == county_id)
    if constituency_id:
        query = query.filter(User.constituency_id == constituency_id)
    
    # Filter for last 2 hours of activity
    time_limit = datetime.now(timezone.utc) - timedelta(hours=2)
    pulses = query.filter(BarazaLivePulse.created_at >= time_limit).all()
    
    if not pulses:
        return [
            {"topic": "Live Sitting Overview", "support": 0, "sentiment": "Waiting for Activity", "sample_size": 0}
        ]
    
    # Aggregation
    total = len(pulses)
    weighted_sum = sum(weight_map.get(p.type, 50) for p in pulses)
    avg_support = weighted_sum / total
    
    sentiment = "Balanced"
    if avg_support > 80: sentiment = "Strongly Supportive"
    elif avg_support > 60: sentiment = "Mostly Positive"
    elif avg_support < 40: sentiment = "High Resistance"
    elif avg_support < 20: sentiment = "Critical Opposition"

    # We return the aggregated data as the primary "Live Sitting" stance
    return [
        {
            "topic": "Live Sitting Overview", 
            "support": round(avg_support), 
            "sentiment": sentiment,
            "sample_size": total
        }
    ]

@router.get("/live/chat", response_model=List[BarazaLiveChatOut])
def get_live_chats(db: Session = Depends(get_db)):
    # Fetch chats from the last 12 hours (Standard Sitting window)
    time_limit = datetime.now(timezone.utc) - timedelta(hours=12)
    chats = db.query(BarazaLiveChat).filter(BarazaLiveChat.created_at >= time_limit).order_by(BarazaLiveChat.created_at.desc()).limit(100).all()
    # Reverse to return oldest to newest (better for UI appending)
    chats.reverse()
    for chat in chats:
        if chat.user:
            if chat.user.is_anonymous_default:
                chat.user_name = "Anonymous Citizen"
            else:
                chat.user_name = chat.user.display_name or chat.user.full_name
        else:
            chat.user_name = "Citizen"
    return chats

@router.get("/live/chat/analytics", response_model=List[BarazaLiveChatOut])
def get_live_chat_analytics(
    county_id: Optional[int] = None,
    constituency_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(BarazaLiveChat).join(User)
    if county_id:
        query = query.filter(User.county_id == county_id)
    if constituency_id:
        query = query.filter(User.constituency_id == constituency_id)
    
    # Apply standard 12-hour live window filter
    time_limit = datetime.now(timezone.utc) - timedelta(hours=12)
    chats = query.filter(BarazaLiveChat.created_at >= time_limit).order_by(BarazaLiveChat.created_at.desc()).limit(100).all()
    for chat in chats:
        if chat.user:
            if chat.user.is_anonymous_default:
                chat.user_name = "Anonymous Citizen"
            else:
                chat.user_name = chat.user.display_name or chat.user.full_name
        else:
            chat.user_name = "Citizen"
    return chats

@router.post("/live/chat", response_model=BarazaLiveChatOut)
def post_live_chat(
    chat: BarazaLiveChatCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Profanity Filter
    if check_profanity(chat.message):
        get_notification_trigger(
            db, "Security", 
            f"User {current_user.email} attempted to post profanity in Live Chat: {chat.message[:50]}...",
            "Medium"
        )
        raise HTTPException(status_code=400, detail="Inappropriate content detected.")

    # 2. Spam & Cooldown
    last_chats = db.query(BarazaLiveChat).filter(
        BarazaLiveChat.user_id == current_user.id
    ).order_by(BarazaLiveChat.created_at.desc()).limit(5).all()
    
    last_messages = [c.message for c in last_chats]
    if is_spam(chat.message, last_messages):
        raise HTTPException(status_code=400, detail="Spam detected. Please wait.")
        
    # Cooldown check (3 seconds)
    if last_chats and last_chats[0].created_at > datetime.now(timezone.utc) - timedelta(seconds=3):
        raise HTTPException(status_code=429, detail="Slow down! You're chatting too fast.")

    # 3. Attach current sitting title if available
    # We look for a meeting happening right now
    now = datetime.now(timezone.utc)
    active_meeting = db.query(BarazaMeeting).filter(
        (BarazaMeeting.scheduled_at <= now) & 
        (BarazaMeeting.scheduled_at >= now - timedelta(hours=4))
    ).first()
    
    s_title = active_meeting.title if active_meeting else "General Sitting"

    db_chat = BarazaLiveChat(
        message=chat.message,
        user_id=current_user.id,
        session_title=s_title
    )
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    if current_user.is_anonymous_default:
        db_chat.user_name = "Anonymous Citizen"
    else:
        db_chat.user_name = current_user.display_name or current_user.full_name
    return db_chat

@router.get("/live/chat/sessions", response_model=List[str])
def get_chat_session_titles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns unique sitting titles for leaders to filter by."""
    if current_user.role != "LEADER":
        raise HTTPException(status_code=403, detail="Only leaders can access chat archives")
    
    titles = db.query(BarazaLiveChat.session_title).distinct().all()
    return [t[0] for t in titles if t[0]]

@router.get("/live/chat/archive", response_model=List[BarazaLiveChatOut])
def get_archived_chats(
    session_title: str,
    county_id: Optional[int] = None,
    constituency_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves full chat history for a specific sitting. Leader only."""
    if current_user.role != "LEADER":
        raise HTTPException(status_code=403, detail="Only leaders can access chat archives")
    
    query = db.query(BarazaLiveChat).join(User).filter(BarazaLiveChat.session_title == session_title)
    if county_id:
        query = query.filter(User.county_id == county_id)
    if constituency_id:
        query = query.filter(User.constituency_id == constituency_id)
        
    chats = query.order_by(BarazaLiveChat.created_at.asc()).all()
    for chat in chats:
        if chat.user:
            chat.user_name = "Anonymous Citizen" if chat.user.is_anonymous_default else (chat.user.display_name or chat.user.full_name)
        else:
            chat.user_name = "Citizen"
    return chats

@router.post("/live/chat/{chat_id}/respond", response_model=BarazaLiveChatOut)
def respond_to_live_chat(
    chat_id: int,
    response_data: OfficialResponseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "LEADER":
        raise HTTPException(status_code=403, detail="Only leaders can respond to live chats")
        
    chat = db.query(BarazaLiveChat).filter(BarazaLiveChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    chat.official_response = response_data.response
    db.commit()
    db.refresh(chat)
    
    if chat.user:
        chat.user_name = "Anonymous Citizen" if chat.user.is_anonymous_default else (chat.user.display_name or chat.user.full_name)
    else:
        chat.user_name = "Citizen"
        
    return chat

# --- Civic IQ & Gamification ---

def _award_badge_if_due(db, user_id: int, badge_name: str):
    """Helper: Award a badge by name if not already earned."""
    badge = db.query(BarazaBadge).filter(BarazaBadge.name == badge_name).first()
    if badge:
        exists = db.query(BarazaUserBadge).filter(
            BarazaUserBadge.user_id == user_id,
            BarazaUserBadge.badge_id == badge.id
        ).first()
        if not exists:
            db.add(BarazaUserBadge(user_id=user_id, badge_id=badge.id))
            return badge_name
    return None

@router.get("/quizzes", response_model=List[BarazaQuizOut])
def get_quizzes(difficulty: str = None, db: Session = Depends(get_db)):
    query = db.query(BarazaQuiz)
    if difficulty:
        query = query.filter(BarazaQuiz.difficulty == difficulty)
    return query.order_by(BarazaQuiz.created_at.desc()).all()

@router.get("/quizzes/generate-daily")
async def generate_daily_quizzes(db: Session = Depends(get_db)):
    """
    Auto-generates one AI quiz per difficulty level if none exists for today.
    Meant to be called on app startup or by a scheduler.
    """
    generated = []
    for difficulty in ["beginner", "intermediate", "advanced"]:
        if not should_generate_quiz_today(db, difficulty):
            continue
        quiz_data = generate_ai_quiz(db, difficulty)
        if not quiz_data:
            continue
        db_quiz = BarazaQuiz(
            title=quiz_data["title"],
            description=quiz_data["description"],
            points_reward=quiz_data["points_reward"],
            difficulty=difficulty,
            source_type="ai_generated",
            generated_date=date.today()
        )
        db.add(db_quiz)
        db.commit()
        db.refresh(db_quiz)
        for q in quiz_data["questions"]:
            db_q = BarazaQuestion(
                quiz_id=db_quiz.id,
                question_text=q["question_text"],
                options=json.dumps(q["options"]),
                correct_option_index=q["correct_index"]
            )
            db.add(db_q)
        db.commit()
        generated.append({"difficulty": difficulty, "title": quiz_data["title"]})
    return {"generated": generated, "message": f"{len(generated)} quizzes generated today."}

@router.get("/user/gamification", response_model=BarazaGamificationStatus)
def get_gamification_status(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    score = db.query(BarazaUserScore).filter(BarazaUserScore.user_id == current_user.id).first()
    points = score.prosperity_points if score else 0
    badges = db.query(BarazaBadge).join(BarazaUserBadge).filter(BarazaUserBadge.user_id == current_user.id).all()
    return {"prosperity_points": points, "badges": badges}

@router.post("/quizzes/{quiz_id}/submit")
def submit_quiz(quiz_id: int, answers: List[int], db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    quiz = db.query(BarazaQuiz).filter(BarazaQuiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions = quiz.questions
    if len(answers) != len(questions):
        raise HTTPException(status_code=400, detail="Invalid number of answers")
    
    correct_count = sum(1 for i, q in enumerate(questions) if answers[i] == q.correct_option_index)
    points_awarded = 0
    new_badges = []

    if correct_count == len(questions):
        # Award points
        score = db.query(BarazaUserScore).filter(BarazaUserScore.user_id == current_user.id).first()
        if not score:
            score = BarazaUserScore(user_id=current_user.id, prosperity_points=quiz.points_reward)
            db.add(score)
        else:
            score.prosperity_points += quiz.points_reward
        db.flush()  # flush so score.prosperity_points is updated before badge checks
        points_awarded = quiz.points_reward

        # --- Badge: First Steps (completed any quiz) ---
        b = _award_badge_if_due(db, current_user.id, "First Steps")
        if b: new_badges.append(b)

        # --- Badge: Civic Novice (completed a beginner quiz) ---
        if quiz.difficulty == "beginner":
            b = _award_badge_if_due(db, current_user.id, "Civic Novice")
            if b: new_badges.append(b)

        # --- Badge: Parliament Scholar (completed an advanced quiz) ---
        if quiz.difficulty == "advanced":
            b = _award_badge_if_due(db, current_user.id, "Parliament Scholar")
            if b: new_badges.append(b)

        # --- Badge: Rising Patriot (50+ prosperity points) ---
        if score.prosperity_points >= 50:
            b = _award_badge_if_due(db, current_user.id, "Rising Patriot")
            if b: new_badges.append(b)

        # --- Badge: Civic Champion (200+ prosperity points) ---
        if score.prosperity_points >= 200:
            b = _award_badge_if_due(db, current_user.id, "Civic Champion")
            if b: new_badges.append(b)

        db.commit()

    return {
        "correct": correct_count,
        "total": len(questions),
        "points_awarded": points_awarded,
        "new_badges": new_badges
    }
