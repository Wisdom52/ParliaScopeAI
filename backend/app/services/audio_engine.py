import edge_tts
import ollama
import os
from datetime import date
from sqlalchemy.orm import Session
from app.models.speech import SpeechSegment
import asyncio

# Ensure static/audio exists relative to the backend run location
# Assuming running from 'backend/' directory
AUDIO_DIR = os.path.join(os.getcwd(), "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

# Voice Mapping
VOICE_MAP = {
    "en": "en-KE-AsiliaNeural",  # Check availability, fallback to en-US-AriaNeural if needed
    "sw": "sw-KE-RafikiNeural"   # Check availability, fallback to sw-TZ-DaudiNeural if needed
}

async def generate_script(db: Session, lang: str = "en") -> str:
    """
    Generates a generic 'Radio-Style' summary script using Ollama (Llama 3).
    For MVP, grabs recent segments.
    """
    segments = db.query(SpeechSegment).limit(20).all()

    if not segments:
        return "No recent parliamentary proceedings found/Hakuna kumbukumbu za hivi karibuni za bunge."

    transcript_text = "\n".join([f"{s.speaker_name}: {s.content}" for s in segments])

    prompt = f"""You are a radio news anchor for 'ParliaScope FM'. 
    Summarize the following parliamentary proceedings into a strictly 1-minute energetic news brief.
    Focus on key debates and decisions.
    
    Language: {lang} (If 'sw', write in Swahili. If 'en', write in English).
    
    Transcript:
    {transcript_text[:3000]} (truncated)
    
    Script:"""

    try:
        response = ollama.chat(model='llama3', messages=[{'role': 'user', 'content': prompt}])
        return response['message']['content']
    except Exception as e:
        return f"Error creating summary: {str(e)}"

async def synthesize_audio(text: str, lang: str = "en") -> str:
    """
    Synthesizes text to speech and saves to a file. Returns the relative web path.
    """
    voice = VOICE_MAP.get(lang, "en-US-AriaNeural") # Fallback to generic US if KE not found
    
    # Simple filename strategy: date + lang
    filename = f"daily_brief_{date.today()}_{lang}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)

    # Note: edge-tts is async
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(filepath)
    
    return f"/static/audio/{filename}"
