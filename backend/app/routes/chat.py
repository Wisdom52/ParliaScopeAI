from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.services.rag import generate_answer
from app.routes.auth import get_current_user_optional
from app.models.user import User
from app.core.logger import logger
from app.core.security_utils import rate_limit
from typing import List, Optional

router = APIRouter(prefix="/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    query: str
    document_id: int
    doc_type: str = "hansard" # "hansard" or "bill"

class Source(BaseModel):
    speaker: str
    preview: str
    id: int

class ChatResponse(BaseModel):
    answer: str
    sources: List[Source]

from fastapi.responses import StreamingResponse

@router.post("/document")
@rate_limit(requests_per_minute=5)
async def chat_document(
    request: ChatRequest, 
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
    raw_request: Request = None  # Needed for rate_limit decorator
):
    try:
        user_identity = user.email if user else "Guest (Anonymous)"
        logger.info(f"Forensic Audit: User {user_identity} queried document {request.document_id} ({request.doc_type}) with query: '{request.query}'")
        
        return StreamingResponse(
            generate_answer(request.query, request.document_id, request.doc_type, db),
            media_type="application/x-ndjson"
        )
    except Exception as e:
        logger.error(f"Chat Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

