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
    3. A 'Consistency Score' (MUST BE BETWEEN 0 AND 100) based on whether their stance has changed over these segments. 100 means perfectly consistent, 0 means complete reversal.
    
    SPEECH SEGMENTS:
    {context}
    
    Output ONLY a JSON array of objects with the following keys:
    "topic", "stance", "analysis", "consistency_score", "evidence_ids" (list of indices from provided segments 0-based).
    """

    try:
        response = ollama.chat(model='llama3.2:3b', messages=[
            {'role': 'user', 'content': prompt},
        ])
        raw_output = response['message']['content']
        
        # Robustly extract JSON array using regex to handle conversational text before/after
        import re
        json_match = re.search(r'\[.*\]', raw_output, re.DOTALL)
        if json_match:
            raw_json = json_match.group(0).strip()
        else:
            raw_json = raw_output.strip()
        
        # Final safety check before parsing
        if not raw_json or not (raw_json.startswith('[') and raw_json.endswith(']')):
             raise ValueError("LLM response did not contain a valid JSON array of topics.")
             
        topic_info = json.loads(raw_json)
        
        # 3. Save to database (LeaderStance)
        stances = []
        overall_score = 0
        for item in topic_info:
            # Ensure score is on 0-100 scale if LLM mistakenly gave 0-10
            raw_val = item.get('consistency_score', 0)
            raw_score = float(raw_val) if raw_val is not None else 0.0
            if raw_score <= 10.0 and any(s.get('consistency_score', 0) > 0 for s in topic_info) and all(s.get('consistency_score', 0) <= 10.0 for s in topic_info):
                # Heuristic: if ALL scores are <= 10, LLM likely used 0-10 scale
                raw_score = raw_score * 10.0
            
            stance_record = LeaderStance(
                speaker_id=speaker_id,
                topic=item['topic'],
                stance=item['stance'],
                analysis=item['analysis'],
                consistency_score=raw_score,
                evidence_ids=[segments[idx].id for idx in item.get('evidence_ids', []) if idx < len(segments)]
            )
            db.add(stance_record)
            stances.append(stance_record)
            overall_score += raw_score
        
        db.commit()
        
        avg_score = round(overall_score / len(topic_info), 1) if topic_info else 100.0
        
        return {
            "overall_consistency": avg_score,
            "summary": f"Based on {len(segments)} segments, the leader shows a consistency score of {avg_score}% across {len(topic_info)} key topics.",
            "topic_breakdown": stances
        }
    except Exception as e:
        print(f"Error in stance analysis: {e}")
        return {
            "overall_consistency": 0,
            "summary": "Stance analysis is currently unavailable or being processed for this leader. Please try again later.",
            "topic_breakdown": []
        }
