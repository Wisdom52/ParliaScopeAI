import json
import logging
from typing import List, Dict, Any
import requests
import os

logger = logging.getLogger(__name__)

OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")
MODEL_NAME = "llama3.2:3b"

def analyze_chunk_impact(chunk: str) -> List[Dict[str, Any]]:
    """Analyzes a single chunk of text for impacts."""
    prompt = f"""
    Analyze this section of a Kenyan Parliamentary Bill for impacts on SMEs, Students, and Farmers.
    For each, provide a specific description and sentiment (Positive, Negative, Neutral).
    Return EXCLUSIVELY a JSON array: [{{"archetype": "...", "description": "...", "sentiment": "..."}}]
    
    TEXT:
    {chunk}
    """
    
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "format": "json"
    }
    
    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
        response.raise_for_status()
        raw_output = response.json().get("response", "").strip()
        logger.debug(f"Raw Ollama output: {raw_output}")
        
        # Clean markdown if present
        if raw_output.startswith("```"):
            raw_output = raw_output.strip("```").strip("json").strip()
            
        return json.loads(raw_output)
    except Exception as e:
        logger.error(f"Chunk analysis failed: {e}. Raw output: {raw_output if 'raw_output' in locals() else 'None'}")
        return []

def generate_bill_impact(bill_text: str) -> List[Dict[str, Any]]:
    """
    Analyzes the provided bill text using a segmentation strategy.
    1. Split large bill into chunks.
    2. Analyze each chunk.
    3. Consolidate impacts by archetype.
    """
    logger.info("Starting Multi-Segment Bill Impact Analysis...")
    
    # Split into ~8000 char chunks to respect context windows
    chunk_size = 8000
    chunks = [bill_text[i:i + chunk_size] for i in range(0, len(bill_text), chunk_size)]
    
    all_raw_impacts = []
    # Limit to first 5 chunks for performance/stability in this phase
    for i, chunk in enumerate(chunks[:5]):
        logger.info(f"Analyzing Segment {i+1}/{len(chunks)}")
        impacts = analyze_chunk_impact(chunk)
        if isinstance(impacts, list):
            all_raw_impacts.extend(impacts)

    logger.info(f"Consolidating {len(all_raw_impacts)} raw impact segments")
    
    # Consolidation logic: Group by archetype
    consolidated = {}
    archetypes = ['SME', 'STUDENT', 'FARMER']
    
    for arch in archetypes:
        # Filter raw impacts for this archetype (fuzzy match)
        matches = [m for m in all_raw_impacts if arch in m.get('archetype', '').upper()]
        if matches:
            # Simple synthesis: Take the first significant description or join them
            desc = " ".join([m.get('description', '') for m in matches[:2]])
            # Majority sentiment
            sentiments = [m.get('sentiment') for m in matches if m.get('sentiment')]
            final_sentiment = max(set(sentiments), key=sentiments.count) if sentiments else "Neutral"
            
            consolidated[arch] = {
                "archetype": arch,
                "description": desc[:300] + ("..." if len(desc) > 300 else ""),
                "sentiment": final_sentiment
            }
        else:
            # Default if no specific impact found in segments
            consolidated[arch] = {
                "archetype": arch,
                "description": "No direct or significant impact identified in the analyzed sections of this bill.",
                "sentiment": "Neutral"
            }

    return list(consolidated.values())
