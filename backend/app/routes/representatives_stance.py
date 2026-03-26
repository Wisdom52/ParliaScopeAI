from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.database import get_db
from app.models.leader_stance import LeaderStance
from app.schemas import StanceAnalysisResponse, StanceRecord
from app.services.stance_analyzer import analyze_speaker_consistency
from typing import List

router = APIRouter(prefix="/representatives", tags=["Representatives Stance"])

@router.get("/{id}/stances", response_model=StanceAnalysisResponse)
async def get_representative_stances(id: int, db: Session = Depends(get_db)):
    # 1. Check if we already have stance analysis for this leader
    stmt = select(LeaderStance).where(LeaderStance.speaker_id == id)
    existing_stances = db.execute(stmt).scalars().all()

    if existing_stances:
        # Calculate overall consistency from stored records with 1 decimal place
        avg_score = round(sum(s.consistency_score for s in existing_stances) / len(existing_stances), 1)
        return {
            "overall_consistency": avg_score,
            "summary": f"Historical stance analysis for this representative across {len(existing_stances)} topics.",
            "topic_breakdown": existing_stances
        }

    # 2. If not, perform fresh analysis
    analysis_result = analyze_speaker_consistency(db, id)
    return analysis_result
