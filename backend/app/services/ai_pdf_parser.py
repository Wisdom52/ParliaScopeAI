import pdfplumber
import json
import httpx
import logging
from typing import List, Dict
from sqlalchemy.orm import Session
from app.models.speech import SpeechSegment
from app.models.speaker import Speaker
from app.services.embedding import get_embedding
from app.services.pdf_parser import match_speaker
import os
import asyncio

logger = logging.getLogger(__name__)

OLLAMA_API = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")
MODEL_NAME = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
TIMEOUT = 1200.0 # 20 minutes for long Hansards

SYSTEM_PROMPT = """
You are an expert parliamentary clerk. Your task is to extract structured dialogue from a Kenyan Hansard transcript.
For the given text, identify EVERY speaker and their exact spoken content.

Output ONLY a valid JSON array of objects with 'speaker' and 'content' keys.
Example:
[
  {"speaker": "The Speaker (Hon. Moses Wetang’ula)", "content": "Order, Members! The House is called to order."},
  {"speaker": "Hon. Junet Mohamed", "content": "Thank you, Mr. Speaker. I rise to move the following Motion..."}
]

DO NOT include any explanation, preamble, or markdown formatting (like ```json). Only the raw JSON array.
"""

SUMMARY_PROMPT = """
You are an expert political analyst. Your task is to provide a concise, high-level summary of a Kenyan Parliamentary Hansard transcript.
The summary should be approximately 3-5 sentences long and cover the main topics discussed and any significant decisions or motions mentioned.

Output ONLY the text of the summary. Do not include any titles, headers, or preamble.
"""

def extract_raw_text(pdf_path: str) -> str:
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.error(f"Error extracting text from PDF {pdf_path}: {e}")
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
                timeout=TIMEOUT
            )
            if response.status_code == 200:
                result = response.json()
                if not isinstance(result, dict):
                    logger.error(f"Unexpected Ollama response type: {type(result)}")
                    return []
                raw_response = result.get('response', '').strip()
                logger.debug(f"Ollama raw response: {raw_response[:200]}...")
                # Remove markdown code blocks if present
                if raw_response.startswith("```"):
                    raw_response = raw_response.strip("```").strip("json").strip()
                try:
                    return json.loads(raw_response)
                except json.JSONDecodeError as je:
                    logger.error(f"JSON Decode Error: {je}. Raw: {raw_response}")
                    return []
            else:
                logger.error(f"Ollama error: Status {response.status_code}, Body: {response.text}")
        except Exception as e:
            logger.error(f"Ollama exception in get_ai_segments: {type(e).__name__}: {e}")
            return []
    return []

async def generate_hansard_summary(text: str) -> str:
    """Generates a high-level summary of the Hansard text using Ollama."""
    # Use the first 7,000 chars for summary
    summary_text = text[:7000]
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                OLLAMA_API,
                json={
                    "model": MODEL_NAME,
                    "prompt": f"{SUMMARY_PROMPT}\n\nHANSARD TEXT:\n{summary_text}",
                    "stream": False
                },
                timeout=TIMEOUT
            )
            if response.status_code == 200:
                result = response.json()
                if not isinstance(result, dict):
                    logger.error(f"Unexpected Ollama summary response type: {type(result)}")
                    return "Summary unavailable (Unexpected response)."
                return result.get('response', '').strip()
            else:
                logger.error(f"Ollama summary error: Status {response.status_code}, Body: {response.text}")
                return "Summary generation failed (API error)."
        except Exception as e:
            logger.error(f"Ollama summarization exception: {type(e).__name__}: {e}")
            return "Summary generation failed (Exception)."
    return "Summary unavailable."

async def process_hansard_with_ai(pdf_path: str, db: Session, hansard_id: int):
    """
    Orchestrates the AI-powered parsing.
    1. Extract Text
    2. Chunk by paragraph
    3. AI Extraction
    4. Database Persistence
    """
    raw_text = await asyncio.to_thread(extract_raw_text, pdf_path)
    if not raw_text:
        return 0

    # 1. Generate and store high-level summary
    logger.info(f"Generating summary for Hansard ID {hansard_id}")
    summary = await generate_hansard_summary(raw_text)
    from app.models.hansard import Hansard
    db.query(Hansard).filter(Hansard.id == hansard_id).update({"ai_summary": summary})
    db.commit()

    # 2. Chunking by paragraphs (double newlines) to avoid splitting speakers
    paragraphs = raw_text.split('\n\n')
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        if len(current_chunk) + len(para) < 4000:
            current_chunk += para + "\n\n"
        else:
            chunks.append(current_chunk)
            current_chunk = para + "\n\n"
    if current_chunk:
        chunks.append(current_chunk)
    
    total_segments = 0
    for i, chunk in enumerate(chunks):
        logger.info(f"Processing chunk {i+1}/{len(chunks)} for Hansard ID {hansard_id}")
        segments = await get_ai_segments(chunk)
        if not segments or not isinstance(segments, list):
            logger.warning(f"No valid segments extracted from chunk {i+1} for Hansard ID {hansard_id}")
            continue
            
        for seg in segments:
            if not isinstance(seg, dict):
                logger.warning(f"Skipping non-dict segment in chunk {i+1}: {seg}")
                continue
                
            speaker_name = seg.get('speaker', 'Unknown')
            content = seg.get('content', '')
            
            if not content: continue
            
            speaker_obj = match_speaker(speaker_name, db)
            
            new_segment = SpeechSegment(
                hansard_id=hansard_id,
                speaker_name=speaker_name,
                content=content,
                speaker_id=speaker_obj.id if speaker_obj else None,
                embedding=await asyncio.to_thread(get_embedding, content)
            )
            db.add(new_segment)
            total_segments += 1
        
        db.commit() # Commit per chunk to save progress
        
    return total_segments
