from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.speaker import Speaker
from app.models.representative_review import RepresentativeReview
from app.models.user import User
from app.schemas import SpeakerOut, ReviewCreate, ReviewOut, OfficialResponseCreate
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
    # Calculate average rating and resolve names
    for rep in reps:
        avg = db.query(func.avg(RepresentativeReview.rating)).filter(
            RepresentativeReview.speaker_id == rep.id
        ).scalar()
        rep.average_rating = float(avg) if avg else 0.0

        # Dynamic area name resolution
        if not rep.county_name and rep.county_id:
            from app.models.location import County
            county = db.query(County).filter(County.id == rep.county_id).first()
            if county:
                rep.county_name = county.name
        if not rep.constituency_name and rep.constituency_id:
            from app.models.location import Constituency
            constituency = db.query(Constituency).filter(Constituency.id == rep.constituency_id).first()
            if constituency:
                rep.constituency_name = constituency.name
        
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
        if user and user.is_anonymous_default:
            review.user_name = "Anonymous Citizen"
        else:
            review.user_name = (user.display_name or user.full_name) if user else "Anonymous Citizen"

    # Dynamic area name resolution
    if not rep.county_name and rep.county_id:
        from app.models.location import County
        county = db.query(County).filter(County.id == rep.county_id).first()
        if county:
            rep.county_name = county.name
    if not rep.constituency_name and rep.constituency_id:
        from app.models.location import Constituency
        constituency = db.query(Constituency).filter(Constituency.id == rep.constituency_id).first()
        if constituency:
            rep.constituency_name = constituency.name
        
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
    
    db_review.user_name = "Anonymous Citizen" if current_user.is_anonymous_default else (current_user.display_name or current_user.full_name)
    return db_review

@router.get("/{id}/reviews", response_model=List[ReviewOut])
def get_representative_reviews(
    id: int,
    county_id: Optional[int] = None,
    constituency_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(RepresentativeReview).join(User).filter(RepresentativeReview.speaker_id == id)
    if county_id:
        query = query.filter(User.county_id == county_id)
    if constituency_id:
        query = query.filter(User.constituency_id == constituency_id)
        
    reviews = query.order_by(RepresentativeReview.created_at.desc()).all()
    
    for review in reviews:
        user = review.user
        if user and user.is_anonymous_default:
            review.user_name = "Anonymous Citizen"
        else:
            review.user_name = (user.display_name or user.full_name) if user else "Anonymous Citizen"
            
    return reviews

@router.post("/{id}/reviews/{review_id}/respond", response_model=ReviewOut)
def respond_to_review(
    id: int,
    review_id: int,
    response_data: OfficialResponseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "LEADER":
        raise HTTPException(status_code=403, detail="Only leaders can respond to reviews")
        
    rep = db.query(Speaker).filter(Speaker.id == id).first()
    # Check if this leader is this speaker
    # Current user might have speaker_id
    if not rep or current_user.speaker_id != rep.id:
        raise HTTPException(status_code=403, detail="You can only respond to your own reviews")
        
    review = db.query(RepresentativeReview).filter(RepresentativeReview.id == review_id, RepresentativeReview.speaker_id == id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
        
    review.official_response = response_data.response
    db.commit()
    db.refresh(review)
    
    user = db.query(User).filter(User.id == review.user_id).first()
    review.user_name = "Anonymous Citizen" if (user and user.is_anonymous_default) else (user.display_name or user.full_name if user else "Citizen")
    return review
