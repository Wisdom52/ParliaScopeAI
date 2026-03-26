from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.bill import Bill, BillImpact
from app.schemas import BillOut, BillCreate, BillImpactOut, PersonalizedImpact
from app.services.impact_agent import generate_bill_impact, generate_personalized_impact
from app.routes.auth import get_current_user, get_current_user_optional
from app.models.user import User
from typing import Optional

router = APIRouter(prefix="/bills", tags=["Bills"])

@router.get("/", response_model=List[BillOut])
def get_bills(q: str = None, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    """Fetch all bills. If authenticated, identify matching topics from user subscriptions."""
    query = db.query(Bill)
    if q:
        query = query.filter(Bill.title.ilike(f"%{q}%"))
    bills = query.order_by(Bill.date.desc(), Bill.created_at.desc()).all()
    
    user_topics = []
    if current_user:
        # User defined topics from subscriptions
        user_topics = [s.topic for s in current_user.subscriptions if s.topic]
    
    for bill in bills:
        # Simple high-performance matching logic
        bill_content = f"{bill.title} {bill.summary or ''}".lower()
        bill.matching_topics = [t for t in user_topics if t.lower() in bill_content]
        
    return bills

@router.get("/{bill_id}", response_model=BillOut)
def get_bill(bill_id: int, db: Session = Depends(get_db)):
    """Fetch a specific bill by ID."""
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill

@router.post("/", response_model=BillOut, status_code=status.HTTP_201_CREATED)
def create_bill(bill_in: BillCreate, db: Session = Depends(get_db)):
    """Manually add a mock bill to the database (for testing the UI)."""
    new_bill = Bill(
        title=bill_in.title,
        summary=bill_in.summary,
        document_url=bill_in.document_url
    )
    db.add(new_bill)
    db.commit()
    db.refresh(new_bill)
    
    # If raw text was provided, we could analyze it immediately, but let's keep it separate
    # to demonstrate the endpoint trigger.
    
    return new_bill

def background_analyze_bill(bill_id: int, db: Session, raw_text: str):
    """Background task to call Ollama and store the structured impact results."""
    impacts_data = generate_bill_impact(raw_text)
    
    for item in impacts_data:
        # Expected structure: {"archetype": "SME", "description": "...", "sentiment": "Positive"}
        new_impact = BillImpact(
            bill_id=bill_id,
            archetype=item.get("archetype", "General"),
            description=item.get("description", "No specific description provided."),
            sentiment=item.get("sentiment", "Neutral")
        )
        db.add(new_impact)
        
    db.commit()

@router.post("/{bill_id}/analyze")
def analyze_bill(bill_id: int, raw_text: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Trigger the local Ollama LLM to segment the bill text and generate archetype impacts."""
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
        
    # Clear existing impacts to avoid duplicates if re-running analysis
    db.query(BillImpact).filter(BillImpact.bill_id == bill_id).delete()
    db.commit()
    
    # Kick off the Ollama request in the background
    background_tasks.add_task(background_analyze_bill, bill.id, db, raw_text)
    
    return {"message": "Bill analysis started in the background. Impacts will appear shortly."}

@router.get("/{bill_id}/personalized-impact", response_model=PersonalizedImpact)
def get_personalized_impact_endpoint(
    bill_id: int, 
    topic: str,
    db: Session = Depends(get_db)
):
    """
    Generate an on-demand AI impact explanation for a specific user-defined topic.
    """
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
        
    # Combine title and summary for context. 
    # For on-demand details, the summary is a rich source.
    context_text = f"BILL TITLE: {bill.title}\n\nSUMMARY:\n{bill.summary or 'No summary available.'}"
    
    impact = generate_personalized_impact(context_text, topic)
    return impact
