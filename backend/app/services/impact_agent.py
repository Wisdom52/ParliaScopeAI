import json
import logging
from typing import List, Dict, Any
import requests

logger = logging.getLogger(__name__)

OLLAMA_API_URL = "http://host.docker.internal:11434/api/generate"
MODEL_NAME = "llama3.2:3b"

def generate_bill_impact(bill_text: str) -> List[Dict[str, Any]]:
    """
    Analyzes the provided bill text and returns a JSON array of impacts.
    Focuses on 3 main archetypes: SME, Student, Farmer.
    """
    logger.info("Initializing Bill Impact Analysis via Ollama...")

    prompt = f"""
    You are an AI policy analyst for the Kenyan Parliament. Your task is to analyze the following bill and determine its impact on three specific groups: SMEs (Small and Medium Enterprises), Students, and Farmers.

    For each archetype, you must provide:
    1. A short, highly specific description (1-2 sentences) of how this bill affects them.
    2. A sentiment rating: exactly one of "Positive", "Negative", or "Neutral".

    Return the result EXCLUSIVELY as a valid JSON array of objects. Do not wrap it in markdown block quotes. Do not include any other text before or after the JSON.
    Format exactly like this:
    [
        {{"archetype": "SME", "description": "...", "sentiment": "..."}},
        {{"archetype": "Student", "description": "...", "sentiment": "..."}},
        {{"archetype": "Farmer", "description": "...", "sentiment": "..."}}
    ]

    BILL TEXT:
    {bill_text}
    """

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "format": "json" # Force JSON output if supported by model version
    }

    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
        response.raise_for_status()
        data = response.json()
        
        raw_output = data.get("response", "").strip()
        logger.info(f"Ollama raw output received: {raw_output[:100]}...")

        # Parse the JSON array
        impacts = json.loads(raw_output)
        
        # Basic validation
        if not isinstance(impacts, list):
            raise ValueError("Output is not a JSON array")
            
        return impacts

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to communicate with Ollama: {e}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Ollama JSON output: {e}\nRaw Output: {raw_output}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error during impact generation: {e}")
        return []
