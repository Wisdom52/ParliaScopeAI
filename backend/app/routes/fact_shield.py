from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from app.database import get_db
from app.models.speech import SpeechSegment
from app.models.bill import Bill
from app.schemas import FactShieldRequest, FactShieldResponse, FactShieldSource
from app.services.embedding import get_embedding
import ollama
from typing import List, Optional

router = APIRouter(prefix="/fact-shield", tags=["Fact-Shield"])

@router.post("/verify", response_model=FactShieldResponse)
async def verify_claim(req: FactShieldRequest, db: Session = Depends(get_db)):
    query = req.claim_text or ""
    if req.url and not query:
        # If only URL is provided, we use it as a keyword hint for now
        query = req.url 

    if not query:
        raise HTTPException(status_code=400, detail="Either claim_text or url must be provided.")

    # 1. Search for context (RAG)
    # Search Hansards (Speeches)
    query_embedding = get_embedding(query)
    speech_stmt = select(SpeechSegment).order_by(SpeechSegment.embedding.l2_distance(query_embedding)).limit(3)
    speeches = db.execute(speech_stmt).scalars().all()

    # Search Bills
    bill_stmt = select(Bill).where(or_(Bill.title.ilike(f"%{query}%"), Bill.summary.ilike(f"%{query}%"))).limit(2)
    bills = db.execute(bill_stmt).scalars().all()

    sources = []
    context_text = ""

    for s in speeches:
        sources.append(FactShieldSource(
            id=s.id,
            title=f"Hansard (Speaker: {s.speaker_name})",
            type="hansard",
            preview=s.content[:150] + "..."
        ))
        context_text += f"[Hansard] Speaker: {s.speaker_name}. Content: {s.content}\n\n"

    for b in bills:
        sources.append(FactShieldSource(
            id=b.id,
            title=f"Bill: {b.title}",
            type="bill",
            preview=b.summary[:150] + "..." if b.summary else "No summary available."
        ))
        context_text += f"[Bill] Title: {b.title}. Summary: {b.summary}\n\n"

    if not sources:
        return FactShieldResponse(
            status="Inconclusive",
            analysis="No relevant official parliamentary records were found to verify or debunk this claim.",
            explanation="The system searched through all indexed Hansards and Bills but found no direct match for the topics mentioned in this claim.",
            sources=[]
        )

    # 2. Ask LLM to verify
    prompt = f"""
    You are a Fact-Checking agent for the Kenyan Parliament.
    Your task is to verify the following claim against the provided official records (context).
    
    CLAIM: {query}
    
    CONTEXT RECORDS:
    {context_text}
    
    INSTRUCTIONS:
    - Compare the claim with the records.
    - Assign a status: 'Verified' (if records confirm it), 'Unverified' (if records contradict it), 'Mixed' (if partially true/false), or 'Inconclusive' (if not enough info).
    - Provide a clear, neutral analysis explaining WHY you gave that status, citing specific speakers or bill titles from the context.
    - Keep your response under 1000 characters.
    - Output MUST lead with the Status in brackets like [Verified] or [Unverified].
    """

    try:
        response = ollama.chat(model='llama3.2:3b', messages=[
            {'role': 'user', 'content': prompt},
        ])
        analysis = response['message']['content']
        
        # Extract status
        status_word = "Inconclusive"
        if "[Verified]" in analysis: status_word = "Verified"
        elif "[Unverified]" in analysis: status_word = "Unverified"
        elif "[Mixed]" in analysis: status_word = "Mixed"
        elif "[Inconclusive]" in analysis: status_word = "Inconclusive"

        return FactShieldResponse(
            status=status_word,
            analysis=analysis.replace(f"[{status_word}]", "").strip(),
            sources=sources
        )
    except Exception as e:
        return FactShieldResponse(
            status="Inconclusive",
            analysis=f"The AI verification engine encountered an error: {str(e)}",
            sources=sources
        )
