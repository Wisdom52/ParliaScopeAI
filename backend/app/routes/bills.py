from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.bill import Bill, BillImpact
from app.schemas import BillOut, BillCreate, BillImpactOut
from app.services.impact_agent import generate_bill_impact
from app.routes.auth import get_current_user

router = APIRouter(prefix="/bills", tags=["Bills"])

@router.get("/", response_model=List[BillOut])
def get_bills(db: Session = Depends(get_db)):
    """Fetch all bills with their associated impact cards."""
    bills = db.query(Bill).order_by(Bill.created_at.desc()).all()
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
