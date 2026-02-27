from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.speaker import Speaker
from app.models.representative_review import RepresentativeReview
from app.models.user import User
from app.schemas import SpeakerOut, ReviewCreate, ReviewOut
from app.routes.auth import get_current_user
from sqlalchemy import func

router = APIRouter(prefix="/representatives", tags=["Representatives"])

@router.get("/", response_model=List[SpeakerOut])
def get_representatives(
    county_id: Optional[int] = None,
    constituency_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Speaker)
    if county_id:
        query = query.filter(Speaker.county_id == county_id)
    if constituency_id:
        query = query.filter(Speaker.constituency_id == constituency_id)
    
    reps = query.all()
    # Calculate average rating for each
    for rep in reps:
        avg = db.query(func.avg(RepresentativeReview.rating)).filter(
            RepresentativeReview.speaker_id == rep.id
        ).scalar()
        rep.average_rating = float(avg) if avg else 0.0
        
    return reps

@router.get("/{id}", response_model=SpeakerOut)
def get_representative(id: int, db: Session = Depends(get_db)):
    rep = db.query(Speaker).filter(Speaker.id == id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Representative not found")
        
    # Calculate average rating
    avg = db.query(func.avg(RepresentativeReview.rating)).filter(
        RepresentativeReview.speaker_id == rep.id
    ).scalar()
    rep.average_rating = float(avg) if avg else 0.0
    
    # Add user names to reviews
    for review in rep.reviews:
        user = db.query(User).filter(User.id == review.user_id).first()
        review.user_name = user.full_name if user else "Anonymous Citizen"
        
    return rep

@router.post("/{id}/reviews", response_model=ReviewOut)
def create_review(
    id: int,
    review: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if MP exists
    rep = db.query(Speaker).filter(Speaker.id == id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Representative not found")
        
    # Create review
    db_review = RepresentativeReview(
        speaker_id=id,
        user_id=current_user.id,
        rating=review.rating,
        comment=review.comment
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    
    db_review.user_name = current_user.full_name
    return db_review
