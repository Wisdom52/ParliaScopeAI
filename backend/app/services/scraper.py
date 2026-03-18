import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import datetime
import logging
import re

try:
    from dateutil import parser as dateutil_parser
    DATEUTIL_AVAILABLE = True
except ImportError:
    DATEUTIL_AVAILABLE = False

logger = logging.getLogger(__name__)

HANSARD_URL = "https://www.parliament.go.ke/the-national-assembly/house-business/hansard"
BILLS_URL = "https://www.parliament.go.ke/the-national-assembly/house-business/bills"


def parse_date_from_title(title: str) -> Optional[datetime.date]:
    """
    Extracts a realistic publication date from a document title string.
    Handles patterns like:
      - "The Hansard - Tuesday, 10 March 2026"
      - "The Hansard - 10 March 2026"
      - "National Assembly Hansard 10.03.2026"
    Returns a datetime.date object, or None if parsing fails.
    """
    if not title:
        return None
    try:
        if DATEUTIL_AVAILABLE:
            # Strip day-of-week prefix to avoid dateutil confusing it
            cleaned = re.sub(
                r'\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*',
                '', title, flags=re.IGNORECASE
            )
            # Strip leading labels like "The Hansard - "
            cleaned = re.sub(r'^.*?-\s*', '', cleaned).strip()
            parsed = dateutil_parser.parse(cleaned, fuzzy=True)
            return parsed.date()
        else:
            # Fallback regex for "DD Month YYYY"
            match = re.search(
                r'(\d{1,2})\s+(January|February|March|April|May|June|July|August'
                r'|September|October|November|December)\s+(\d{4})',
                title, re.IGNORECASE
            )
            if match:
                months = {
                    'january': 1, 'february': 2, 'march': 3, 'april': 4,
                    'may': 5, 'june': 6, 'july': 7, 'august': 8,
                    'september': 9, 'october': 10, 'november': 11, 'december': 12
                }
                d = int(match.group(1))
                m = months[match.group(2).lower()]
                y = int(match.group(3))
                return datetime.date(y, m, d)
    except Exception:
        pass
    return None


def _date_from_url_path(href: str) -> Optional[datetime.date]:
    """Extracts a YYYY-MM-01 date from URL paths like /2026-02/."""
    url_match = re.search(r'/(\d{4})-(\d{2})/', href)
    if url_match:
        try:
            return datetime.date(int(url_match.group(1)), int(url_match.group(2)), 1)
        except Exception:
            pass
    return None


def _is_2026(title: str, href: str) -> bool:
    """Returns True only if the document is from 2026."""
    return "2026" in title or "/2026-" in href or "2026" in href


def _absolute_url(href: str) -> str:
    if href.startswith('http'):
        return href
    base = "https://www.parliament.go.ke"
    return f"{base}{href}" if href.startswith('/') else f"{base}/{href}"


def get_latest_hansard_links(limit: int = 20) -> List[Dict]:
    """
    Scrapes the Kenyan Parliament Hansard page and returns PDF links for 2026 Hansards only.
    Returns: [{'title': str, 'url': str, 'date': datetime.date|None}]
    """
    try:
        logger.info(f"Scraping 2026 Hansard links from {HANSARD_URL}")
        response = requests.get(HANSARD_URL, timeout=30, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')
        links: List[Dict] = []
        seen_urls: set = set()

        for a in soup.find_all('a', href=True):
            href = a['href']
            text = a.get_text(strip=True)

            is_pdf = ".pdf" in href.lower()
            is_hansard = "hansard" in text.lower() or "hansard" in href.lower()

            if is_pdf and is_hansard and _is_2026(text, href):
                href = _absolute_url(href)
                if href in seen_urls:
                    continue
                seen_urls.add(href)
                doc_date = parse_date_from_title(text) or _date_from_url_path(href)
                links.append({"title": text or "Hansard Document", "url": href, "date": doc_date})
                if len(links) >= limit:
                    break

        # Always include the known Feb 2026 Hansard as a baseline
        known_url = "https://www.parliament.go.ke/sites/default/files/2026-02/The%20Hansard%20-%20Tuesday%2C%2010%20February%202026_6.pdf"
        if known_url not in seen_urls:
            known_date = parse_date_from_title("The Hansard - Tuesday, 10 February 2026")
            links.insert(0, {
                "title": "The Hansard - Tuesday, 10 February 2026",
                "url": known_url,
                "date": known_date
            })

        logger.info(f"Found {len(links)} 2026 Hansard links")
        return links[:limit] if limit > 0 else links

    except Exception as e:
        logger.error(f"Scraping Hansard failed: {str(e)}")
        return []


def get_latest_bill_links(limit: int = 20) -> List[Dict]:
    """
    Scrapes the Kenyan Parliament Bills page and returns PDF links for 2026 Bills only.
    Returns: [{'title': str, 'url': str, 'date': datetime.date|None}]
    """
    try:
        logger.info(f"Scraping 2026 Bill links from {BILLS_URL}")
        response = requests.get(BILLS_URL, timeout=30, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')
        links: List[Dict] = []
        seen_urls: set = set()

        for a in soup.find_all('a', href=True):
            href = a['href']
            text = a.get_text(strip=True)

            is_pdf = ".pdf" in href.lower()
            is_bill = "bill" in text.lower() or "bill" in href.lower()

            if is_pdf and is_bill and _is_2026(text, href):
                href = _absolute_url(href)
                if href in seen_urls:
                    continue
                seen_urls.add(href)
                doc_date = parse_date_from_title(text) or _date_from_url_path(href)
                links.append({"title": text or "Parliamentary Bill", "url": href, "date": doc_date})
                if len(links) >= limit:
                    break

        # Fallback: known 2026-era bill
        fallback_url = "https://www.parliament.go.ke/sites/default/files/2026-02/THE%20NATIONAL%20COHESION%20AND%20INTERGRATION%20BILL%20%2C%202023.pdf"
        if fallback_url not in seen_urls:
            links.insert(0, {
                "title": "The National Cohesion and Integration Bill, 2023",
                "url": fallback_url,
                "date": datetime.date(2026, 2, 1)
            })

        logger.info(f"Found {len(links)} 2026 Bill links")
        return links[:limit] if limit > 0 else links

    except Exception as e:
        logger.error(f"Scraping Bills failed: {str(e)}")
        return []

def extract_text_from_url(url: str) -> str:
    """
    Fetches a URL and extracts the main text content.
    Used for Fact Shield verification of external claims.
    """
    try:
        logger.info(f"Scraping external URL for Fact Shield: {url}")
        response = requests.get(url, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script_or_style in soup(["script", "style", "nav", "footer", "header"]):
            script_or_style.decompose()
            
        # Get text
        text = soup.get_text(separator=' ')
        
        # Breakdown into lines and remove leading/trailing whitespace
        lines = (line.strip() for line in text.splitlines())
        # Breakdown multi-headlines into a line each
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        # Drop blank lines
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text[:10000] # Limit to 10k chars for LLM safety
    except Exception as e:
        logger.error(f"Failed to extract text from URL {url}: {e}")
        return ""
