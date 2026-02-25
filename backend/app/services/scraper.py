import requests
from bs4 import BeautifulSoup
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

HANSARD_URL = "https://www.parliament.go.ke/the-national-assembly/house-business/hansard"
BILLS_URL = "https://www.parliament.go.ke/the-national-assembly/house-business/bills"

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
        
        # Add the specific requested Hansard manually if not already found
        specific_url = "https://www.parliament.go.ke/sites/default/files/2026-02/The%20Hansard%20-%20Tuesday%2C%2010%20February%202026_6.pdf"
        if not any(l['url'] == specific_url for l in links):
            links.insert(0, {
                "title": "The Hansard - Tuesday, 10 February 2026",
                "url": specific_url
            })

        logger.info(f"Found {len(links)} Hansard links")
        return links[:limit] if limit > 0 else links
        
    except Exception as e:
        logger.error(f"Scraping Hansard failed: {str(e)}")
        return []

def get_latest_bill_links(limit: int = 5) -> List[Dict[str, str]]:
    """
    Scrapes the Kenyan Parliament Bills page and returns the latest PDF links.
    Returns: [{'title': str, 'url': str}]
    """
    try:
        logger.info(f"Scraping Bill links from {BILLS_URL}")
        response = requests.get(BILLS_URL, timeout=20, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        links = []
        
        # In the Bills page, they are often in table rows or specific containers
        for a in soup.find_all('a', href=True):
            href = a['href']
            text = a.get_text(strip=True)
            
            is_pdf = ".pdf" in href.lower()
            # Often contains keywords like "Bill", "Act", or is inside a specific list
            is_bill = "bill" in text.lower() or "bill" in href.lower()
            
            if is_pdf and is_bill:
                if not href.startswith('http'):
                    base_url = "https://www.parliament.go.ke"
                    if href.startswith('/'):
                        href = f"{base_url}{href}"
                    else:
                        href = f"{base_url}/{href}"
                
                if any(l['url'] == href for l in links):
                    continue
                
                links.append({
                    "title": text or "Parliamentary Bill",
                    "url": href
                })
                
                if len(links) >= limit:
                    break
        
        # Fallback to specific bill if none found or for testing
        fallback_bill = "https://www.parliament.go.ke/sites/default/files/2026-02/THE%20NATIONAL%20COHESION%20AND%20INTERGRATION%20BILL%20%2C%202023.pdf"
        if not any(l['url'] == fallback_bill for l in links):
            links.insert(0, {
                "title": "The National Cohesion and Integration Bill, 2023",
                "url": fallback_bill
            })
            
        logger.info(f"Found {len(links)} Bill links")
        return links[:limit] if limit > 0 else links
        
    except Exception as e:
        logger.error(f"Scraping Bills failed: {str(e)}")
        return []
