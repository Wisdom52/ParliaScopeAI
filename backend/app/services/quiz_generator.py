import json
import random
import ollama
from datetime import date
from sqlalchemy.orm import Session
from app.core.logger import logger

DIFFICULTY_CONFIG = {
    "beginner": {
        "points_reward": 10,
        "num_questions": 3,
        "topic_hint": "basic facts about the Kenyan parliament, its structure, and simple terms"
    },
    "intermediate": {
        "points_reward": 25,
        "num_questions": 4,
        "topic_hint": "debates, bills, and specific parliamentary procedures discussed in the Kenyan National Assembly"
    },
    "advanced": {
        "points_reward": 50,
        "num_questions": 5,
        "topic_hint": "detailed provisions of recent bills, specific speeches, committee decisions, and constitutional amendments"
    }
}

def _get_context_from_db(db: Session, difficulty: str) -> str:
    """
    Fetches relevant context from Hansards or Bills to ground the AI quiz questions
    in real, current parliamentary data.
    """
    context_parts = []
    try:
        from app.models.hansard import Hansard
        hansards = db.query(Hansard).filter(
            Hansard.ai_summary != None
        ).order_by(Hansard.date.desc()).limit(5).all()

        for h in hansards:
            if h.ai_summary:
                context_parts.append(f"Parliamentary Session — {h.title}:\n{h.ai_summary[:400]}")
    except Exception as e:
        logger.warning(f"Could not fetch Hansard context: {e}")

    try:
        from app.models.bill import Bill
        bills = db.query(Bill).filter(
            Bill.summary != None
        ).order_by(Bill.id.desc()).limit(3).all()

        for b in bills:
            if b.summary:
                context_parts.append(f"Active Bill — {b.title}:\n{b.summary[:300]}")
    except Exception as e:
        logger.warning(f"Could not fetch Bill context: {e}")

    if not context_parts:
        return "General knowledge about the Kenyan Parliament, the National Assembly, the Senate, and major laws."

    random.shuffle(context_parts)
    return "\n\n---\n\n".join(context_parts[:4])


def generate_ai_quiz(db: Session, difficulty: str = "beginner") -> dict | None:
    """
    Uses Ollama to generate a progressive civic quiz based on real parliamentary data.

    Returns a dict with: title, description, questions (list), points_reward, difficulty
    Or None if generation fails.
    """
    config = DIFFICULTY_CONFIG.get(difficulty, DIFFICULTY_CONFIG["beginner"])
    context = _get_context_from_db(db, difficulty)
    num_q = config["num_questions"]
    topic_hint = config["topic_hint"]

    prompt = f"""You are an expert civic education AI for Kenya. Your task is to generate a challenging but fair quiz about the Kenyan Parliament.

Difficulty level: {difficulty.upper()}
Focus on: {topic_hint}

Use this real parliamentary data as your source of truth:
---
{context}
---

Generate EXACTLY {num_q} multiple-choice questions. Each question must:
1. Be directly based on the parliamentary data above (do not invent facts not mentioned).
2. Have exactly 4 answer options (A, B, C, D style).
3. Have a clear single correct answer.
4. Be distinctly harder than the "beginner" level if you are generating intermediate/advanced.

You MUST respond with ONLY valid JSON in this exact format (no extra text, no markdown):
{{
  "title": "A descriptive quiz title",
  "description": "A one-sentence description of this quiz's focus",
  "questions": [
    {{
      "question_text": "The question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0
    }}
  ]
}}

The correct_index is the 0-based index of the correct option in the options array."""

    try:
        logger.info(f"Generating AI quiz with difficulty: {difficulty}")
        response = ollama.chat(model='llama3.2:3b', messages=[
            {'role': 'user', 'content': prompt}
        ])
        raw = response['message']['content'].strip()

        # Try to extract JSON from the response
        # Sometimes model wraps it in markdown code fences
        if '```json' in raw:
            raw = raw.split('```json')[1].split('```')[0].strip()
        elif '```' in raw:
            raw = raw.split('```')[1].split('```')[0].strip()

        data = json.loads(raw)

        # Validate structure
        assert 'title' in data
        assert 'questions' in data
        assert len(data['questions']) >= 1

        for q in data['questions']:
            assert 'question_text' in q
            assert 'options' in q and len(q['options']) == 4
            assert 'correct_index' in q
            assert 0 <= q['correct_index'] <= 3

        logger.info(f"AI quiz generated successfully: '{data['title']}' with {len(data['questions'])} questions.")
        return {
            "title": data['title'],
            "description": data.get('description', f"A {difficulty} level Civic IQ challenge."),
            "questions": data['questions'],
            "points_reward": config['points_reward'],
            "difficulty": difficulty,
        }

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI quiz JSON for difficulty '{difficulty}': {e}. Raw: {raw[:200]}")
        return None
    except AssertionError as e:
        logger.error(f"AI quiz structure validation failed for difficulty '{difficulty}': {e}")
        return None
    except Exception as e:
        logger.error(f"Ollama error during quiz generation: {e}", exc_info=True)
        return None


def should_generate_quiz_today(db: Session, difficulty: str) -> bool:
    """
    Returns True if we should generate a new quiz for this difficulty level today.
    Generates at most 1 quiz per difficulty per day.
    """
    from app.models.baraza import BarazaQuiz
    today = date.today()
    existing = db.query(BarazaQuiz).filter(
        BarazaQuiz.difficulty == difficulty,
        BarazaQuiz.source_type == "ai_generated",
        BarazaQuiz.generated_date == today
    ).first()
    return existing is None
