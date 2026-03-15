from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.verification_request import LeaderVerificationRequest
from app.models.speaker import Speaker
from app.routes.auth import get_current_admin_user
from app.core.logger import logger
from datetime import datetime
from typing import List

router = APIRouter(prefix="/admin/leaders", tags=["Admin - Leader Management"])

@router.get("/pending")
def get_pending_claims(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """List all pending leader identity claims with user and official profile details."""
    claims = db.query(LeaderVerificationRequest).filter(LeaderVerificationRequest.status == "PENDING").all()
    
    results = []
    for claim in claims:
        results.append({
            "id": claim.id,
            "user_id": claim.user_id,
            "user_email": claim.user.email,
            "speaker_id": claim.speaker_id,
            "speaker_name": claim.speaker.name,
            "speaker_role": claim.speaker.role,
            "maisha_card_url": claim.maisha_card_url,
            "staff_card_url": claim.staff_card_url,
            "created_at": claim.created_at
        })
    return results

@router.post("/{claim_id}/authorize")
def authorize_leader(
    claim_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """
    Finalize leader verification.
    1. Updates the User's role to LEADER and links the Speaker profile.
    2. Marks the Verification Request as APPROVED.
    """
    claim = db.query(LeaderVerificationRequest).filter(LeaderVerificationRequest.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim request not found.")
    
    if claim.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Claim is already {claim.status}.")

    user = db.query(User).filter(User.id == claim.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User associated with claim not found.")

    # Apply the promotion
    user.role = "LEADER"
    user.is_verified = True
    user.speaker_id = claim.speaker_id
    
    # Update request status
    claim.status = "APPROVED"
    claim.processed_at = datetime.utcnow()
    claim.admin_notes = f"Authorized by Admin {admin.email}"

    db.commit()
    logger.info(f"Leader identity AUTHORIZED: {user.email} is now the verified account for {claim.speaker.name}")
    return {"detail": f"Leader identity for {claim.speaker.name} has been authorized."}

@router.patch("/{user_id}/status")
def toggle_leader_status(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Pause or resume a verified leader's account activity."""
    user = db.query(User).filter(User.id == user_id, User.role == "LEADER").first()
    if not user:
        raise HTTPException(status_code=404, detail="Verified leader account not found.")

    user.is_active = not user.is_active
    db.commit()
    
    action = "RESUMED" if user.is_active else "PAUSED"
    logger.info(f"Leader account {user.email} was {action} by admin {admin.email}")
    return {"detail": f"Leader account has been {action}.", "is_active": user.is_active}

@router.get("/active")
def get_verified_leaders(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """List all currently verified parliamentary leaders."""
    leaders = db.query(User).filter(User.role == "LEADER", User.is_verified == True).all()
    results = []
    for l in leaders:
        # Fetch the speaker details
        speaker = db.query(Speaker).filter(Speaker.id == l.speaker_id).first()
        results.append({
            "id": l.id,
            "email": l.email,
            "full_name": l.full_name,
            "speaker_name": speaker.name if speaker else "Unknown",
            "speaker_role": speaker.role if speaker else "N/A",
            "is_active": l.is_active
        })
    return results
