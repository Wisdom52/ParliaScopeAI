import requests
from bs4 import BeautifulSoup
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

HANSARD_URL = "https://www.parliament.go.ke/the-national-assembly/house-business/hansard"

def get_latest_hansard_links(limit: int = 5) -> List[Dict[str, str]]:
    """
    Scrapes the Kenyan Parliament Hansard page and returns the latest PDF links.
    Returns: [{'title': str, 'url': str}]
    """
    try:
        logger.info(f"Scraping Hansard links from {HANSARD_URL}")
        response = requests.get(HANSARD_URL, timeout=20, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        links = []
        
        # Look for links that contain "Hansard" and lead to a PDF
        for a in soup.find_all('a', href=True):
            href = a['href']
            text = a.get_text(strip=True)
            
            # Common patterns for Hansard PDFs on this site
            is_pdf = ".pdf" in href.lower()
            is_hansard = "hansard" in text.lower() or "hansard" in href.lower()
            
            if is_pdf and is_hansard:
                # Ensure it's an absolute URL
                if not href.startswith('http'):
                    base_url = "https://www.parliament.go.ke"
                    if href.startswith('/'):
                        href = f"{base_url}{href}"
                    else:
                        href = f"{base_url}/{href}"
                
                # Avoid duplicates
                if any(l['url'] == href for l in links):
                    continue
                
                links.append({
                    "title": text or "Hansard Document",
                    "url": href
                })
                
                if len(links) >= limit:
                    break
        
        logger.info(f"Found {len(links)} Hansard links")
        return links
        
    except Exception as e:
        logger.error(f"Scraping Hansard failed: {str(e)}")
        return []
