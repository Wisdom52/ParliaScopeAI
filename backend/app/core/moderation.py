import re
from typing import List

# Basic curated list for English & Swahili
BANNED_WORDS = [
    "hate", "stupid", "idiot", "tusi", "mpumbavu", "mjinga", "sheet", "dammit",
    # Add more as needed for a real production environment
]

def check_profanity(text: str) -> bool:
    """Returns True if profanity is detected."""
    lower_text = text.lower()
    for word in BANNED_WORDS:
        if word in lower_text:
            return True
    return False

def is_spam(text: str, user_history: List[str]) -> bool:
    # Basic spam detection logic
    if not text.strip():
        return True
    
    # Check if user is repeating the exact same thing (only for longer qualitative tests)
    if len(text) > 5 and user_history and text == user_history[-1]:
        return True
        
    # Check for excessive capitalization (only for longer messages to allow short tests like "TEST")
    if len(text) > 10:
        caps = sum(1 for c in text if c.isupper())
        if caps / len(text) > 0.9:
            return True
        
    return False

def sanitize_for_prompt(query: str) -> str:
    """Neutralizes common prompt injection patterns."""
    adversarial_patterns = [
        r"(?i)ignore\s+previous\s+instructions",
        r"(?i)system:",
        r"(?i)\[INST\]",
        r"(?i)you\s+are\s+now\s+a",
        r"(?i)forget\s+everything",
    ]
    
    sanitized = query
    for pattern in adversarial_patterns:
        sanitized = re.sub(pattern, "[REDACTED ADVERSARIAL ATTEMPT]", sanitized)
        
    return sanitized
