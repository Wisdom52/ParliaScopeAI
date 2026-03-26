from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.search_engine import hybrid_search, log_search
from app.models.search_history import SearchHistory
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/search", tags=["Search"])

class SearchResult(BaseModel):
    id: int
    speaker_name: str
    snippet: str          # First 200 chars with query term highlighted
    content_length: int   # Full content length so UI can show "Read more"
    created_at: datetime
    
    class Config:
        from_attributes = True

class HistoryItem(BaseModel):
    query: str
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/query", response_model=List[SearchResult])
def search_hansard(
    q: str, 
    speaker_id: Optional[int] = None, 
    db: Session = Depends(get_db)
):
    """
    Performs hybrid search.
    """
    filters = {}
    if speaker_id:
        filters['speaker_id'] = speaker_id
        
    # Log search (user_id optional for lazy auth)
    log_search(db, q)
    
    results = hybrid_search(db, q, limit=20, filters=filters)

    def make_snippet(content: str, query: str, length: int = 200) -> str:
        """Return a short excerpt centred on the first match, with match bolded."""
        lower = content.lower()
        pos = lower.find(query.lower())
        if pos == -1:
            excerpt = content[:length]
        else:
            start = max(0, pos - 80)
            excerpt = content[start:start + length]
        # Bold the matching term (markdown convention used by the chat renderer)
        import re
        excerpt = re.sub(re.escape(query), f"**{query}**", excerpt, flags=re.IGNORECASE)
        if len(content) > length:
            excerpt += "…"
        return excerpt

    return [
        SearchResult(
            id=r.id,
            speaker_name=r.speaker_name,
            snippet=make_snippet(r.content, q),
            content_length=len(r.content),
            created_at=r.created_at,
        )
        for r in results
    ]

@router.get("/history", response_model=List[HistoryItem])
def get_search_history(db: Session = Depends(get_db)):
    """
    Returns recent global searches (for MVP). 
    In prod, filter by current user.
    """
    history = db.query(SearchHistory).order_by(SearchHistory.created_at.desc()).limit(10).all()
    return history
