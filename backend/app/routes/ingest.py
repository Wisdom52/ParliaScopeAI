from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.pdf_parser import process_hansard_pdf
import shutil
import tempfile
import os

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

@router.post("/hansard")
async def ingest_hansard(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF allowed.")
    
    # Save upload to temp file for processing
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    
    try:
        # Process PDF
        # Note: process_hansard_pdf expects a file path or file-like object 
        # pdfplumber.open(path) works with string path
        count = process_hansard_pdf(tmp_path, db)
        return {"message": "Hansard processed successfully", "segments_created": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        os.remove(tmp_path)
