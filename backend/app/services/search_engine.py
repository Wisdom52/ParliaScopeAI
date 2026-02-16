from sqlalchemy.orm import Session
from sqlalchemy import select, text, or_
from app.models.speech import SpeechSegment
from app.models.search_history import SearchHistory
from app.services.embedding import get_embedding
from typing import List, Dict, Any

def log_search(db: Session, query: str, user_id: int = None):
    """Logs the user search query."""
    history = SearchHistory(query=query, user_id=user_id)
    db.add(history)
    db.commit()

def hybrid_search(db: Session, query: str, limit: int = 10, filters: Dict[str, Any] = None) -> List[SpeechSegment]:
    """
    Performs hybrid search using Reciprocal Rank Fusion (RRF).
    Combines Semantic Search (pgvector) and Keyword Search (ILIKE).
    """
    if not filters:
        filters = {}

    # 1. Semantic Search
    query_embedding = get_embedding(query)
    semantic_stmt = select(SpeechSegment).order_by(SpeechSegment.embedding.l2_distance(query_embedding)).limit(limit * 2)
    
    # Apply filters
    if filters.get('speaker_id'):
        semantic_stmt = semantic_stmt.where(SpeechSegment.speaker_id == filters['speaker_id'])
    
    semantic_results = db.execute(semantic_stmt).scalars().all()

    # 2. Keyword Search (Simple ILIKE for MVP)
    # Ideally use Full Text Search (tsvector) but ILIKE is easier for immediate setup without schema migration for tsvector index
    keyword_stmt = select(SpeechSegment).where(SpeechSegment.content.ilike(f"%{query}%")).limit(limit * 2)
    
    if filters.get('speaker_id'):
        keyword_stmt = keyword_stmt.where(SpeechSegment.speaker_id == filters['speaker_id'])
        
    keyword_results = db.execute(keyword_stmt).scalars().all()

    # 3. Reciprocal Rank Fusion (RRF)
    # RRF score = 1 / (k + rank)
    k = 60
    scores = {}

    # Initial semantic ranking
    for rank, item in enumerate(semantic_results):
        if item.id not in scores:
            scores[item.id] = {"item": item, "score": 0}
        scores[item.id]["score"] += 1.0 / (k + rank + 1)

    # Initial keyword ranking
    for rank, item in enumerate(keyword_results):
        if item.id not in scores:
            scores[item.id] = {"item": item, "score": 0}
        scores[item.id]["score"] += 1.0 / (k + rank + 1)

    # Sort by score desc
    sorted_items = sorted(scores.values(), key=lambda x: x["score"], reverse=True)
    
    # Return top N
    return [x["item"] for x in sorted_items[:limit]]
