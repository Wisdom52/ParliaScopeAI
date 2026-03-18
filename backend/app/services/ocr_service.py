import base64
import io
import logging
import httpx
import pypdfium2 as pdfium
from PIL import Image
import os
import asyncio

logger = logging.getLogger(__name__)

OLLAMA_API = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")
OCR_MODEL = "moondream:latest"
TIMEOUT = 300.0 # 5 minutes per page max

async def extract_text_from_page(image_bytes: bytes) -> str:
    """Uses Ollama moondream to extract text from a single page image."""
    image_b64 = base64.b64encode(image_bytes).decode('utf-8')
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                OLLAMA_API,
                json={
                    "model": OCR_MODEL,
                    "prompt": "Read all the text in this image and output it as plain text. Do not include descriptions or commentary.",
                    "images": [image_b64],
                    "stream": False
                },
                timeout=TIMEOUT
            )
            if response.status_code == 200:
                result = response.json()
                return result.get('response', '').strip()
            else:
                logger.error(f"OCR page error: Status {response.status_code}")
                return ""
        except Exception as e:
            logger.error(f"OCR page exception: {e}")
            return ""
    return "" # Explicit fallback

async def extract_text_via_ocr(pdf_path: str, max_pages: int = 20) -> str:
    """Renders PDF pages to images and extracts text using vision AI."""
    logger.info(f"Starting OCR for {pdf_path}")
    
    if not os.path.exists(pdf_path):
        logger.error(f"PDF not found: {pdf_path}")
        return ""
        
    try:
        pdf = pdfium.PdfDocument(pdf_path)
        n_pages = len(pdf)
        logger.info(f"PDF has {n_pages} pages. Processing up to {max_pages}.")
        
        full_text = ""
        # We only process up to a limit for performance in this hackathon context
        pages_to_process = min(n_pages, max_pages)
        
        for i in range(pages_to_process):
            logger.info(f"OCR Processing page {i+1}/{pages_to_process}...")
            page = pdf[i]
            # 150 DPI is usually enough for OCR
            bitmap = page.render(scale=2) 
            pil_image = bitmap.to_pil()
            
            # Save to buffer
            buf = io.BytesIO()
            pil_image.save(buf, format="JPEG", quality=85)
            image_bytes = buf.getvalue()
            
            page_text = await extract_text_from_page(image_bytes)
            if page_text:
                full_text += f"\n--- Page {i+1} ---\n" + page_text
                
        return full_text
    except Exception as e:
        logger.error(f"OCR process failed for {pdf_path}: {e}")
        return ""
