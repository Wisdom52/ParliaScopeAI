from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.services.rag import generate_answer
from typing import List

router = APIRouter(prefix="/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    query: str

class Source(BaseModel):
    speaker: str
    preview: str
    id: int

class ChatResponse(BaseModel):
    answer: str
    sources: List[Source]

@router.post("/hansard", response_model=ChatResponse)
def chat_hansard(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        # result is a dict {"answer": str, "sources": list}
        result = generate_answer(request.query, db)
        return result
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
