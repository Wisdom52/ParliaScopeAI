from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.hansard import Hansard
from app import schemas
from typing import List

router = APIRouter(prefix="/docs", tags=["Documents"])

@router.get("/", response_model=List[schemas.Hansard])
def list_documents(db: Session = Depends(get_db)):
    """Returns a list of all processed Hansard documents."""
    return db.query(Hansard).order_by(Hansard.created_at.desc()).all()
