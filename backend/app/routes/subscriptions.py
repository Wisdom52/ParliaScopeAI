from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas import SubscriptionCreate, SubscriptionOut
from app.routes.auth import get_current_user
from app.services.notification import send_whatsapp_alert, send_push_notification

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

@router.get("/", response_model=List[SubscriptionOut])
def get_user_subscriptions(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get all subscriptions for the currently authenticated user."""
    subs = db.query(Subscription).filter(Subscription.user_id == current_user.id).all()
    return subs

@router.post("/", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
def create_subscription(
    sub_in: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new topic or MP subscription."""
    # Validate that at least one is provided
    if not sub_in.topic and not sub_in.speaker_id:
        raise HTTPException(
            status_code=400, 
            detail="Must provide either a topic or a speaker_id to subscribe to."
        )

    # Check for duplicates
    existing = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.topic == sub_in.topic,
        Subscription.speaker_id == sub_in.speaker_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Subscription already exists.")

    new_sub = Subscription(
        user_id=current_user.id,
        topic=sub_in.topic,
        speaker_id=sub_in.speaker_id
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    # Simulate an immediate welcome/confirmation notification if contact info exists
    message_target = f"Topic: {sub_in.topic}" if sub_in.topic else f"MP ID: {sub_in.speaker_id}"
    msg = f"ParliaScope: You are now subscribed to alerts for {message_target}."
    
    if current_user.whatsapp_number:
        send_whatsapp_alert(current_user.whatsapp_number, msg)
    if current_user.push_token:
        send_push_notification(current_user.push_token, msg)

    return new_sub

@router.delete("/{sub_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a subscription."""
    sub = db.query(Subscription).filter(
        Subscription.id == sub_id, 
        Subscription.user_id == current_user.id
    ).first()
    
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    db.delete(sub)
    db.commit()
    return None
