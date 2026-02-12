from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.audio_engine import generate_script, synthesize_audio
from app.services.embedding import get_embedding # Not used directly here but ensures models loaded
import os

router = APIRouter(prefix="/audio", tags=["Audio"])

@router.get("/daily-brief")
async def get_daily_brief(lang: str = "en", db: Session = Depends(get_db)):
    """
    Generates (if not exists) and returns the URL for today's audio brief.
    """
    try:
        # 1. Generate Script
        script = await generate_script(db, lang)
        
        # 2. Synthesize Audio
        audio_url = await synthesize_audio(script, lang)
        
        return {
            "title": f"Daily Brief ({lang.upper()})",
            "audio_url": f"http://localhost:8000{audio_url}", # Absolute URL for local dev
            "transcript": script
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
