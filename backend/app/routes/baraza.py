from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.baraza import (
    BarazaMeeting, BarazaPoll, BarazaPollOption, BarazaPollVote, 
    BarazaForumPost, BarazaForumComment, BarazaLivePulse,
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
    BarazaQuizOut, BarazaGamificationStatus
)
from app.routes.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/baraza", tags=["Digital Baraza"])

# --- Meetings ---
@router.get("/meetings", response_model=List[BarazaMeetingOut])
def get_meetings(db: Session = Depends(get_db)):
    from datetime import timedelta
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    return db.query(BarazaMeeting).filter(
        BarazaMeeting.scheduled_at >= two_hours_ago
    ).order_by(BarazaMeeting.scheduled_at.asc()).all()

@router.post("/meetings", response_model=BarazaMeetingOut)
def create_meeting(
    meeting: BarazaMeetingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meeting_data = meeting.dict()
    meeting_data["host_id"] = current_user.id
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
def get_polls(db: Session = Depends(get_db)):
    polls = db.query(BarazaPoll).order_by(BarazaPoll.created_at.desc()).all()
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

    # Check expiration
    if db_poll.expires_at and db_poll.expires_at < datetime.utcnow():
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
def get_forum_posts(db: Session = Depends(get_db)):
    posts = db.query(BarazaForumPost).order_by(BarazaForumPost.created_at.desc()).all()
    # Add author name
    for post in posts:
        post.author_name = post.author.full_name if post.author else "Citizen"
    return posts

@router.post("/forum", response_model=BarazaForumPostOut)
def create_forum_post(
    post: BarazaForumPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_post = BarazaForumPost(
        title=post.title,
        content=post.content,
        author_id=current_user.id
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    db_post.author_name = current_user.full_name
    return db_post

@router.post("/forum/comments", response_model=BarazaForumCommentOut)
def create_comment(
    comment: BarazaForumCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_comment = BarazaForumComment(
        post_id=comment.post_id,
        author_id=current_user.id,
        content=comment.content
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    db_comment.author_name = current_user.full_name
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

# --- Civic IQ & Gamification ---
@router.get("/quizzes", response_model=List[BarazaQuizOut])
def get_quizzes(db: Session = Depends(get_db)):
    return db.query(BarazaQuiz).all()

@router.get("/user/gamification", response_model=BarazaGamificationStatus)
def get_gamification_status(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    score = db.query(BarazaUserScore).filter(BarazaUserScore.user_id == current_user.id).first()
    points = score.prosperity_points if score else 0
    
    badges = db.query(BarazaBadge).join(BarazaUserBadge).filter(BarazaUserBadge.user_id == current_user.id).all()
    
    return {
        "prosperity_points": points,
        "badges": badges
    }

@router.post("/quizzes/{quiz_id}/submit")
def submit_quiz(quiz_id: int, answers: List[int], db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    quiz = db.query(BarazaQuiz).filter(BarazaQuiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions = quiz.questions
    if len(answers) != len(questions):
        raise HTTPException(status_code=400, detail="Invalid number of answers")
    
    correct_count = 0
    for i, q in enumerate(questions):
        if answers[i] == q.correct_option_index:
            correct_count += 1
            
    # Award points if perfect score (simplified logic)
    if correct_count == len(questions):
        score = db.query(BarazaUserScore).filter(BarazaUserScore.user_id == current_user.id).first()
        if not score:
            score = BarazaUserScore(user_id=current_user.id, prosperity_points=quiz.points_reward)
            db.add(score)
        else:
            score.prosperity_points += quiz.points_reward
        
        # Check for first quiz badge
        badge = db.query(BarazaBadge).filter(BarazaBadge.name == "First Steps").first()
        if badge:
            exists = db.query(BarazaUserBadge).filter(
                BarazaUserBadge.user_id == current_user.id,
                BarazaUserBadge.badge_id == badge.id
            ).first()
            if not exists:
                new_ub = BarazaUserBadge(user_id=current_user.id, badge_id=badge.id)
                db.add(new_ub)
        
        db.commit()
        return {"correct": correct_count, "total": len(questions), "points_awarded": quiz.points_reward}
    
    return {"correct": correct_count, "total": len(questions), "points_awarded": 0}
