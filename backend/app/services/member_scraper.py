import requests
from bs4 import BeautifulSoup
import logging
import re
import time

logger = logging.getLogger(__name__)

BASE_URL = "https://www.parliament.go.ke"
MPS_LIST_URL = f"{BASE_URL}/the-national-assembly/mps"

def get_soup(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return BeautifulSoup(response.text, 'html.parser')
    except Exception as e:
        logger.error(f"Error fetching {url}: {e}")
        return None

def scrape_mp_details(profile_url):
    """Scrapes individual MP profile for education, experience, etc."""
    soup = get_soup(profile_url)
    if not soup:
        return {}
    
    details = {
        "education": "",
        "experience": "",
        "bills_count": 0,
        "bio": ""
    }
    
    # 1. Education
    edu_section = soup.find(id="collapse1")
    if edu_section:
        details['education'] = edu_section.get_text(separator="\n", strip=True)

    # 2. Employment/Experience
    exp_section = soup.find(id="collapse2")
    if exp_section:
        details['experience'] = exp_section.get_text(separator="\n", strip=True)

    # 3. Bills Sponsored
    # often in collapse4
    bills_section = soup.find(id="collapse4")
    if bills_section:
        # Just grab the text for now
        details['bills_count'] = len(bills_section.find_all('li')) or 0

    # 4. General bio/summary - sometimes not explicitly labeled, use content area
    summary = soup.find('div', class_='field--name-body')
    if summary:
        details['bio'] = summary.get_text(strip=True)[:1000]

    return details

def get_all_representatives():
    """Scrapes the main MP list and deep dives into profiles."""
    all_mps = []
    
    # Parliament.go.ke has about 35-36 pages (0 to 35)
    # Total MPs = 349 (290 elected + 47 women reps + 12 nominated)
    max_pages = 36 
    
    for page in range(max_pages):
        page_url = f"{MPS_LIST_URL}?page={page}"
        logger.info(f"Scraping page {page}: {page_url}")
        soup = get_soup(page_url)
        if not soup:
            break
            
        table = soup.find('table', class_='cols-7')
        if not table:
            logger.warning(f"No table found on page {page}")
            continue
            
        rows = table.find('tbody').find_all('tr', class_='mp') if table.find('tbody') else table.find_all('tr', class_='mp')
        
        for row in rows:
            try:
                cols = row.find_all('td')
                if len(cols) < 7: continue
                
                name = cols[0].get_text(strip=True)
                if not name:
                    # Sometimes name is in index 1 if index 0 is empty (seen in debug)
                    name = cols[1].find('img')['alt'] if cols[1].find('img') else "Unknown"
                
                # Profile link is in the last column or image column
                profile_link_tag = cols[6].find('a') or cols[1].find('a')
                if not profile_link_tag: continue
                
                profile_path = profile_link_tag['href']
                full_profile_url = BASE_URL + profile_path if profile_path.startswith('/') else profile_path
                
                county = cols[2].get_text(strip=True)
                constituency = cols[3].get_text(strip=True)
                party = cols[4].get_text(strip=True)
                status = cols[5].get_text(strip=True)

                logger.info(f"Deep scraping MP {name}...")
                time.sleep(0.5) # Soft rate limit
                details = scrape_mp_details(full_profile_url)
                
                # Extract image url if possible
                image_tag = cols[1].find('img')
                image_url = BASE_URL + image_tag['src'] if image_tag and image_tag.get('src') else None
                if not image_url:
                    image_url = f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=random&color=fff"

                all_mps.append({
                    "name": name,
                    "area": constituency or county or "National",
                    "party": party,
                    "role": "MP",
                    "bio": details.get("bio", f"MP for {constituency or county}. Status: {status}"),
                    "education": details.get("education", ""),
                    "experience": details.get("experience", ""),
                    "bills_sponsored": details.get("bills_count", 0),
                    "image_url": image_url,
                    "county": county,
                    "constituency": constituency,
                    "status": status
                })
                
            except Exception as e:
                logger.error(f"Error parsing row: {e}")
                continue
                
    if not all_mps:
        logger.warning("No MPs scraped, using placeholder for safety.")
        return [
            {"name": "HON. ARMA SAMUEL", "area": "NAKURU WEST", "party": "Jubilee", "role": "MP", "bio": "Representative for Nakuru West."},
        ]
        
    return all_mps
