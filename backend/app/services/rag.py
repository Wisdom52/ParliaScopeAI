import ollama
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.speech import SpeechSegment
from app.services.embedding import get_embedding
from app.core.logger import logger
from app.core.moderation import sanitize_for_prompt
from app.core.security_utils import get_notification_trigger

def search_similar_segments(query: str, document_id: int, db: Session, limit: int = 5):
    """
    Searches for the most similar speech segments to the query within a specific hansard_id
    using pgvector (L2 distance).
    """
    query_embedding = get_embedding(query)
    
    # pgvector's l2_distance operator is <->
    # We want to order by distance ascending (closest first)
    stmt = (
        select(SpeechSegment)
        .filter(SpeechSegment.hansard_id == document_id)
        .order_by(SpeechSegment.embedding.l2_distance(query_embedding))
        .limit(limit)
    )
    results = db.execute(stmt).scalars().all()
    logger.info(f"Found {len(results)} similar segments for query: '{query}'")
    return results

def generate_answer(query: str, document_id: int, doc_type: str, db: Session):
    """
    RAG Pipeline:
    1. Embed query & search DB (filtered by doc_type and document_id).
    2. Construct prompt with context.
    3. Call Ollama for answer.
    """
    # 0. Prompt Injection Check
    sanitized_query = sanitize_for_prompt(query)
    if "[REDACTED ADVERSARIAL ATTEMPT]" in sanitized_query:
        get_notification_trigger(
            db, "Security", 
            f"Adversarial Prompt Injection attempt detected in query: {query[:100]}...",
            "High"
        )
        # We'll allow the sanitized version to proceed but AI will likely refuse
        query = sanitized_query

    if doc_type == "hansard":
        logger.info(f"Starting RAG generation for Hansard ID {document_id}")
        segments = search_similar_segments(query, document_id, db)

    
    if doc_type == "hansard":
        if not segments:
            from app.models.hansard import Hansard
            hansard = db.query(Hansard).filter(Hansard.id == document_id).first()
            if hansard and (hansard.title or hansard.ai_summary):
                context_text = f"Hansard Title: {hansard.title}\nSummary: {hansard.ai_summary}\n\nThe detailed specific excerpts are not yet available for this document."
                sources = [{
                    "speaker": "Official Hansard Record",
                    "preview": hansard.title,
                    "id": hansard.id
                }]
                prompt = f"""You are an AI assistant for the Kenyan Parliament. Answer the user's question based ONLY on the following Hansard summary data.
                Do NOT invent or add information not present in the context below.
                If the context does not contain enough information to answer the question confidently, explicitly say: "I don't have enough verified data in the parliamentary records to answer this accurately."
                
                Context:
                {context_text}
                
                Question: {query}
                
                Answer (be concise):"""
            else:
                return {
                    "answer": "I couldn't find any relevant information in this parliamentary record to answer your question.",
                    "sources": []
                }
        else:
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
            Do NOT invent or add information not present in the context below.
            If the context does not contain enough information to answer the question confidently, explicitly say: "I don't have enough verified data in the parliamentary records to answer this accurately."
            
            Context:
            {context_text}
            
            Question: {query}
            
            Answer (be concise and cite the speaker names):"""

    elif doc_type == "bill":
        logger.info(f"Starting RAG generation for Bill ID {document_id}")
        from app.models.bill import Bill
        
        bill = db.query(Bill).filter(Bill.id == document_id).first()
        if not bill:
            return {
                "answer": "I couldn't find this bill's context in the database.",
                "sources": []
            }
            
        impacts = bill.impacts
        
        if not bill.summary and not impacts:
            return {
                "answer": f"The detailed summary and impacts for the bill '{bill.title}' are still being processed. Please check back shortly.",
                "sources": [{
                    "speaker": "Official Bill Record",
                    "preview": bill.title,
                    "id": bill.id
                }]
            }
            
        context_text = f"Bill Title: {bill.title}\n"
        if bill.summary:
            context_text += f"Summary: {bill.summary}\n\n"
        
        if impacts:
            context_text += "Impacts:\n"
            for imp in impacts:
                context_text += f"Archetype: {imp.archetype} ({imp.sentiment})\nDescription: {imp.description}\n\n"
            
        sources = [{
            "speaker": "Official Bill Record",
            "preview": bill.title,
            "id": bill.id
        }]
        
        prompt = f"""You are an AI assistant for the Kenyan Parliament. Answer the user's question based ONLY on the following Bill summary and impact data.
        Do NOT invent or add information not present in the context below.
        If the context does not contain enough information to answer the question confidently, explicitly say: "I don't have enough verified data in the parliamentary records to answer this accurately."
        
        Context:
        {context_text}
        
        Question: {query}
        
        Answer (be concise and focus on the bill's provisions/impacts):"""
    
    # Call Ollama
    # Assumes 'llama3' is pulled, or falls back to 'mistral' or user default.
    # We'll try 'llama3' first, user said "ollama is already installed", hopefully they have a model.
    # We can default to 'llama3:latest'
    try:
        response = ollama.chat(model='llama3.2:3b', messages=[
            {'role': 'user', 'content': prompt},
        ])
        answer = response['message']['content']
        logger.info("Successfully generated AI answer via Ollama.")
    except Exception as e:
        # Fallback handling or specific error message
        logger.error(f"Error communicating with Ollama in generate_answer: {str(e)}", exc_info=True)
        answer = f"Error communicating with Ollama: {str(e)}. Please ensure 'llama3.2:3b' model is pulled (ollama pull llama3.2:3b)."

    return {
        "answer": answer,
        "sources": sources
    }

