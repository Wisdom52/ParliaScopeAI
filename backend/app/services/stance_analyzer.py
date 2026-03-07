import ollama
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.speech import SpeechSegment
from app.models.leader_stance import LeaderStance
from typing import List, Dict
import json

def analyze_speaker_consistency(db: Session, speaker_id: int):
    # 1. Fetch all speeches for this speaker
    stmt = select(SpeechSegment).where(SpeechSegment.speaker_id == speaker_id).order_by(SpeechSegment.created_at.asc())
    segments = db.execute(stmt).scalars().all()

    if not segments:
        return {
            "overall_consistency": 0,
            "summary": "No historical data found for this representative.",
            "topic_breakdown": []
        }

    # 2. Extract topics and stances using LLM
    # We'll process segments in a batch or the most significant ones
    context = "\n".join([f"Date: {s.created_at}, Content: {s.content}" for s in segments[:15]]) # Limit context for LLM

    prompt = f"""
    Analyze the following parliamentary speech segments from a single leader.
    Identify the main topics discussed (e.g., 'Taxation', 'Education Reform', 'Health Policy').
    For each topic, determine:
    1. The leader's stance (Supportive/Opposed/Neutral).
    2. A brief analysis of their argument.
    3. A 'Consistency Score' (0-100) based on whether their stance has changed over these segments.
    
    SPEECH SEGMENTS:
    {context}
    
    Output ONLY a JSON array of objects with the following keys:
    "topic", "stance", "analysis", "consistency_score", "evidence_ids" (list of indices from provided segments 0-based).
    """

    try:
        response = ollama.chat(model='llama3.2:3b', messages=[
            {'role': 'user', 'content': prompt},
        ])
        raw_json = response['message']['content']
        # Extract JSON if LLM added markdown
        if "```json" in raw_json:
            raw_json = raw_json.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_json:
            raw_json = raw_json.split("```")[1].split("```")[0].strip()
        
        topic_info = json.loads(raw_json)
        
        # 3. Save to database (LeaderStance)
        stances = []
        overall_score = 0
        for item in topic_info:
            stance_record = LeaderStance(
                speaker_id=speaker_id,
                topic=item['topic'],
                stance=item['stance'],
                analysis=item['analysis'],
                consistency_score=float(item['consistency_score']),
                evidence_ids=[segments[idx].id for idx in item.get('evidence_ids', []) if idx < len(segments)]
            )
            db.add(stance_record)
            stances.append(stance_record)
            overall_score += item['consistency_score']
        
        db.commit()
        
        avg_score = overall_score / len(topic_info) if topic_info else 100
        
        return {
            "overall_consistency": avg_score,
            "summary": f"Based on {len(segments)} segments, the leader shows a consistency score of {avg_score:.1f}% across {len(topic_info)} key topics.",
            "topic_breakdown": stances
        }
    except Exception as e:
        print(f"Error in stance analysis: {e}")
        return {
            "overall_consistency": 0,
            "summary": f"Analysis failed: {str(e)}",
            "topic_breakdown": []
        }
