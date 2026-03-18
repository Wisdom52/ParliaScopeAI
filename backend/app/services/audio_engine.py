import edge_tts
import ollama
import os
from datetime import date
from sqlalchemy.orm import Session
from app.models.speech import SpeechSegment
import asyncio
from app.core.logger import logger

# Ensure static/audio exists relative to the backend run location
# Assuming running from 'backend/' directory
AUDIO_DIR = os.path.join(os.getcwd(), "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

# Voice Mapping
VOICE_MAP = {
    "en": "en-KE-AsiliaNeural",  # Check availability, fallback to en-US-AriaNeural if needed
    "sw": "sw-KE-RafikiNeural"   # Check availability, fallback to sw-TZ-DaudiNeural if needed
}

async def get_latest_brief_items(db: Session):
    """
    Returns a list of Hansards and Bills from the most recent session date.
    """
    # Find the most recent date with activity
    from sqlalchemy import desc, func
    from app.models.bill import Bill
    from app.models.hansard import Hansard

    latest_hansard = db.query(Hansard.date).filter(Hansard.date != None).order_by(desc(Hansard.date)).first()
    latest_bill = db.query(func.date(Bill.created_at)).order_by(desc(Bill.created_at)).first()

    latest_date = None
    if latest_hansard and latest_bill:
        latest_date = max(latest_hansard[0], latest_bill[0])
    elif latest_hansard:
        latest_date = latest_hansard[0]
    elif latest_bill:
        latest_date = latest_bill[0]

    if not latest_date:
        return [], None

    hansards = db.query(Hansard).filter(Hansard.date == latest_date).all()
    bills = db.query(Bill).filter(func.date(Bill.created_at) == latest_date).all()

    items = []
    for h in hansards:
        items.append({
            "id": h.id,
            "type": "hansard",
            "title": h.title,
            "has_summary": bool(h.ai_summary),
            "source_url": h.pdf_url  # Link back to original Hansard PDF on parliament.go.ke
        })
    
    for b in bills:
        items.append({
            "id": b.id,
            "type": "bill",
            "title": b.title,
            "has_summary": bool(b.summary),
            "source_url": b.document_url  # Link back to original Bill PDF on parliament.go.ke
        })

    return items, latest_date

async def get_document_brief(db: Session, item_id: int, item_type: str, lang: str = "en") -> dict:
    """
    Fetches the specific summary for a document, translates if needed, and generates the audio URL.
    """
    from app.models.bill import Bill
    from app.models.hansard import Hansard

    if item_type == "hansard":
        item = db.query(Hansard).filter(Hansard.id == item_id).first()
        raw_summary = item.ai_summary if item else None
        title = item.title if item else "Unknown Hansard"
        source_url = item.pdf_url if item else None
    else:
        item = db.query(Bill).filter(Bill.id == item_id).first()
        raw_summary = item.summary if item else None
        title = item.title if item else "Unknown Bill"
        source_url = item.document_url if item else None

    if not raw_summary:
        return {"transcript": "Summary not available for this document.", "audio_url": None}

    # Translation if Swahili requested
    transcript = raw_summary
    if lang == "sw":
        prompt = f"""Translate the following parliamentary summary into clear, formal, and engaging Swahili.
        Summary of {title}:
        {raw_summary[:5000]}
        
        SWAHILI TRANSLATION:"""
        try:
            response = ollama.chat(
                model='llama3.2:3b', 
                messages=[{'role': 'user', 'content': prompt}]
            )
            transcript = response['message']['content']
        except Exception as e:
            logger.error(f"Error translating to Swahili using llama3.2:3b: {str(e)}")
            transcript = f"Error translating to Swahili: {str(e)}\n\nOriginal English:\n{raw_summary}"

    # Generate Audio
    audio_path = await synthesize_audio(transcript, lang, f"{item_type}_{item_id}")
    
    return {
        "transcript": transcript,
        "audio_url": audio_path,
        "title": title,
        "source_url": source_url  # Direct link to original PDF for traceability / anti-hallucination
    }

async def synthesize_audio(text: str, lang: str = "en", identifier: str = "daily") -> str:
    """
    Synthesizes text to speech. Identifier ensures unique files per document.
    """
    voice = VOICE_MAP.get(lang, "en-US-AriaNeural")
    filename = f"brief_{identifier}_{lang}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)

    # Check if file exists and is not empty (at least 1KB)
    if not os.path.exists(filepath) or os.path.getsize(filepath) < 1024:
        if os.path.exists(filepath):
            os.remove(filepath)
            
        logger.info(f"Synthesizing audio for {identifier} in {lang}...")
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(filepath)
            logger.info(f"Successfully synthesized audio to {filepath}")
        except Exception as e:
            logger.error(f"Failed to synthesize audio: {str(e)}")
            # Don't return partial/broken files
            if os.path.exists(filepath):
                os.remove(filepath)
            return None
    
    return f"/static/audio/{filename}"
