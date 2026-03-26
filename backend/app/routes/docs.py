from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.hansard import Hansard
from app import schemas
from typing import List

router = APIRouter(prefix="/hansards", tags=["Hansards"])

@router.get("/", response_model=List[schemas.Hansard])
def list_documents(q: str = None, db: Session = Depends(get_db)):
    """Returns a list of all processed Hansard documents."""
    query = db.query(Hansard)
    if q:
        query = query.filter(Hansard.title.ilike(f"%{q}%"))
    return query.order_by(Hansard.date.desc(), Hansard.created_at.desc()).all()
