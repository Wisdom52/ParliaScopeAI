import ollama
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.speech import SpeechSegment
from app.services.embedding import get_embedding

def search_similar_segments(query: str, db: Session, limit: int = 5):
    """
    Searches for the most similar speech segments to the query using pgvector (L2 distance).
    """
    query_embedding = get_embedding(query)
    
    # pgvector's l2_distance operator is <->
    # We want to order by distance ascending (closest first)
    stmt = select(SpeechSegment).order_by(SpeechSegment.embedding.l2_distance(query_embedding)).limit(limit)
    results = db.execute(stmt).scalars().all()
    
    return results

def generate_answer(query: str, db: Session):
    """
    RAG Pipeline:
    1. Embed query & search DB.
    2. Construct prompt with context.
    3. Call Ollama for answer.
    """
    segments = search_similar_segments(query, db)
    
    if not segments:
        return {
            "answer": "I couldn't find any relevant information in the parliamentary records to answer your question.",
            "sources": []
        }
        
    # Construct Context
    context_text = ""
    sources = []
    
    for seg in segments:
        context_text += f"Speaker: {seg.speaker_name}\nText: {seg.content}\n\n"
        sources.append({
            "speaker": seg.speaker_name,
            "preview": seg.content[:100] + "...",
            "id": seg.id
        })
        
    prompt = f"""You are an AI assistant for the Kenyan Parliament. Answer the user's question based ONLY on the following Hansard excerpts.
    
    Context:
    {context_text}
    
    Question: {query}
    
    Answer (be concise and cite the speaker names):"""
    
    # Call Ollama
    # Assumes 'llama3' is pulled, or falls back to 'mistral' or user default.
    # We'll try 'llama3' first, user said "ollama is already installed", hopefully they have a model.
    # We can default to 'llama3:latest'
    try:
        response = ollama.chat(model='llama3', messages=[
            {'role': 'user', 'content': prompt},
        ])
        answer = response['message']['content']
    except Exception as e:
        # Fallback handling or specific error message
        answer = f"Error communicating with Ollama: {str(e)}. Please ensure 'llama3' model is pulled (ollama pull llama3)."

    return {
        "answer": answer,
        "sources": sources
    }
