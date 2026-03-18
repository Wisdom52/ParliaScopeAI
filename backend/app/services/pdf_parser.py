import pdfplumber
import re
from typing import List, Dict, Tuple
from fuzzywuzzy import process
from sqlalchemy.orm import Session
from app.models.speech import SpeechSegment
from app.models.speaker import Speaker
from app.services.embedding import get_embedding

def extract_text_from_pdf(pdf_file) -> str:
    """Extracts raw text from a PDF file-like object."""
    text = ""
    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def parse_hansard_text(text: str) -> List[Dict]:
    """
    Parses raw Hansard text into segments attributed to speakers.
    Assumes format like 'The Speaker: ...' or 'Hon. Member: ...'
    This is a heuristic implementation and might need tuning based on exact PDF layout.
    """
    segments = []
    
    # Regex to find speaker definitions, e.g. "The Speaker (Hon. Moses Wetang'ula):" or "Hon. Junet Mohamed (Suna East, ODM):"
    # Basic Pattern: Newline, Title/Name, Colon
    # Improved Pattern: Look for lines starting with 'The ...:' or 'Hon. ...:'
    pattern = re.compile(r'\n(The\s[A-Za-z\s\.\(\)\']+?|Hon\.\s[A-Za-z\s\.\(\)\',]+?):')
    
    # Split text by speaker pattern
    parts = pattern.split(text)
    
    # parts[0] is text before the first speaker (preamble)
    if not parts:
        return []

    # The split results in [preamble, speaker1_name, speaker1_text, speaker2_name, speaker2_text, ...]
    # We skip parts[0] and iterate in steps of 2
    
    current_idx = 1
    while current_idx < len(parts) - 1:
        speaker_name = parts[current_idx].strip()
        speech_content = parts[current_idx + 1].strip()
        
        if speaker_name and speech_content:
            segments.append({
                "speaker": speaker_name,
                "content": speech_content
            })
        
        current_idx += 2
        
    return segments

def match_speaker(name: str, db: Session) -> Speaker:
    """
    Attempts to match the extracted speaker name to a DB record using fuzzy matching.
    Includes normalization for parliamentary titles like "Hon." or "The Speaker".
    """
    clean_name = name.strip()
    
    # Extract everything inside parentheses
    paren_match = re.search(r'\((.*?)\)', clean_name)
    inside_paren = paren_match.group(1) if paren_match else ""
    
    # Remove the parentheses and their contents from the main string
    outside_paren = re.sub(r'\(.*?\)', '', clean_name).strip()
    
    # Heuristic: If outside_paren is just a generic title, the actual name is probably inside the parentheses.
    generic_titles = ["the speaker", "the temporary speaker", "the deputy speaker", "chairperson"]
    if outside_paren.lower() in generic_titles and inside_paren:
        candidate_name = inside_paren
    else:
        # Otherwise, the name is likely outside the parentheses (e.g., "Hon. Junet Mohamed (Suna East)")
        candidate_name = outside_paren
        
    # Remove standard titles for the match search
    candidate_name = re.sub(r'\b(Hon\.|Hon|Dr\.|Dr|The Speaker|The Temporary Speaker|The|Senator|MP)\b', '', candidate_name, flags=re.IGNORECASE).strip()

    speakers = db.query(Speaker).all()
    if not speakers:
        return None
        
    speaker_names = [s.name for s in speakers]
    
    # 2. Fuzzy match
    best_match, score = process.extractOne(candidate_name, speaker_names)
    
    if score >= 75: 
        matched_obj = next((s for s in speakers if s.name == best_match), None)
        return matched_obj
    
    return None

def process_hansard_pdf(pdf_file, db: Session, hansard_id: int = None) -> int:
    """
    Full pipeline: Parse PDF -> Extract Segments -> Map Speakers -> Save to DB.
    Returns number of segments processed.
    """
    raw_text = extract_text_from_pdf(pdf_file)
    segments = parse_hansard_text(raw_text)
    
    saved_count = 0
    for seg in segments:
        speaker_name = seg['speaker']
        content = seg['content']
        
        # Try to find speaker mapping
        speaker_obj = match_speaker(speaker_name, db)
        
        new_segment = SpeechSegment(
            hansard_id=hansard_id,
            speaker_name=speaker_name,
            content=content,
            speaker_id=speaker_obj.id if speaker_obj else None,
            embedding=get_embedding(content) # Generate embedding
        )
        db.add(new_segment)
        saved_count += 1
        
    db.commit()
    return saved_count
