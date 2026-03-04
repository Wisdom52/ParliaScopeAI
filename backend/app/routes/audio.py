from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
# Imports for engine functions are done inside endpoint logic to avoid cycles
from app.services.embedding import get_embedding # Not used directly here but ensures models loaded
import os

router = APIRouter(prefix="/audio", tags=["Audio"])

@router.get("/daily-brief/list")
async def get_daily_brief_list(db: Session = Depends(get_db)):
    """
    Returns the list of documents for the most recent session date.
    """
    try:
        from app.services.audio_engine import get_latest_brief_items
        items, latest_date = await get_latest_brief_items(db)
        return {
            "date": latest_date,
            "items": items
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily-brief")
async def get_daily_brief(
    item_id: int, 
    item_type: str, 
    lang: str = "en", 
    db: Session = Depends(get_db)
):
    """
    Returns the transcript and audio URL for a specific document.
    """
    try:
        from app.services.audio_engine import get_document_brief
        data = await get_document_brief(db, item_id, item_type, lang)
        
        # Ensure absolute URL for frontend
        if data.get("audio_url"):
            data["audio_url"] = f"http://localhost:8000{data['audio_url']}"
            
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
