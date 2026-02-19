import pdfplumber
import json
import httpx
from typing import List, Dict
from sqlalchemy.orm import Session
from app.models.speech import SpeechSegment
from app.models.speaker import Speaker
from app.services.embedding import get_embedding
from app.services.pdf_parser import match_speaker

OLLAMA_API = "http://localhost:11434/api/generate"
MODEL_NAME = "mistral:7b-instruct-v0.2-q4_K_M"

SYSTEM_PROMPT = """
You are an expert parliamentary clerk. Your task is to extract structured dialogue from a Kenyan Hansard transcript.
For the given text, identify EVERY speaker and their exact spoken content.

Output ONLY a JSON array of objects with 'speaker' and 'content' keys.
Example:
[
  {"speaker": "The Speaker (Hon. Moses Wetang’ula)", "content": "Order, Members! The House is called to order."},
  {"speaker": "Hon. Junet Mohamed", "content": "Thank you, Mr. Speaker. I rise to move the following Motion..."}
]

DO NOT include any explanation or preamble. Only the JSON array.
"""

def extract_raw_text(pdf_path: str) -> str:
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

async def get_ai_segments(text_chunk: str) -> List[Dict]:
    """Sends a chunk of text to Ollama and gets structured segments."""
    prompt = f"Extract speakers and content from this Hansard text:\n\n{text_chunk}"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                OLLAMA_API,
                json={
                    "model": MODEL_NAME,
                    "prompt": f"{SYSTEM_PROMPT}\n\n{prompt}",
                    "stream": False,
                    "format": "json"
                },
                timeout=120.0
            )
            if response.status_code == 200:
                result = response.json()
                return json.loads(result['response'])
        except Exception as e:
            print(f"Ollama error: {e}")
            return []
    return []

async def process_hansard_with_ai(pdf_path: str, db: Session, hansard_id: int):
    """
    Orchestrates the AI-powered parsing.
    1. Extract Text
    2. Chunk (by ~2000 chars to fit context)
    3. AI Extraction
    4. Database Persistence
    """
    raw_text = extract_raw_text(pdf_path)
    
    # Simple chunking by characters (ideally should be by semantic boundary)
    chunk_size = 2000
    chunks = [raw_text[i:i+chunk_size] for i in range(0, len(raw_text), chunk_size)]
    
    total_segments = 0
    for chunk in chunks:
        segments = await get_ai_segments(chunk)
        for seg in segments:
            speaker_name = seg.get('speaker', 'Unknown')
            content = seg.get('content', '')
            
            if not content: continue
            
            speaker_obj = match_speaker(speaker_name, db)
            
            new_segment = SpeechSegment(
                hansard_id=hansard_id,
                speaker_name=speaker_name,
                content=content,
                speaker_id=speaker_obj.id if speaker_obj else None,
                embedding=get_embedding(content)
            )
            db.add(new_segment)
            total_segments += 1
        
        db.commit() # Commit per chunk to save progress
        
    return total_segments
