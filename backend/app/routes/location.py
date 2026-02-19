from fastapi import APIRouter, Depends, HTTPException
import httpx
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.location import County, Constituency
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/location", tags=["Location"])

class LocationItem(BaseModel):
    id: int
    name: str

@router.get("/counties", response_model=List[LocationItem])
def get_counties(db: Session = Depends(get_db)):
    return db.query(County).all()

@router.get("/constituencies", response_model=List[LocationItem])
def get_constituencies(county_id: int, db: Session = Depends(get_db)):
    return db.query(Constituency).filter(Constituency.county_id == county_id).all()

@router.get("/reverse")
async def reverse_geocode(lat: float, lng: float, db: Session = Depends(get_db)):
    if not (-5.0 <= lat <= 5.5 and 33.5 <= lng <= 42.0):
        raise HTTPException(status_code=400, detail="Coordinates outside Kenya boundaries")
        
    try:
        async with httpx.AsyncClient() as client:
            url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&addressdetails=1"
            response = await client.get(url, headers={"User-Agent": "ParliaScope/1.0"})
            if response.status_code != 200:
                return {"county": None, "constituency": None, "detail": "Geocoding service unavailable"}
            
            data = response.json()
            address = data.get("address", {})
            
            county_name = address.get("county") or address.get("state")
            # Nominatim often returns constituency-level info in 'city_district', 'suburb', or 'town' for Kenya
            constituency_name = address.get("city_district") or address.get("suburb") or address.get("town")
            
            db_county = None
            if county_name:
                clean_county = county_name.replace(" County", "").strip()
                db_county = db.query(County).filter(County.name.ilike(f"%{clean_county}%")).first()
            
            db_constituency = None
            if db_county and constituency_name:
                db_constituency = db.query(Constituency).filter(
                    Constituency.county_id == db_county.id,
                    Constituency.name.ilike(f"%{constituency_name}%")
                ).first()
                
            return {
                "county": {"id": db_county.id, "name": db_county.name} if db_county else None,
                "constituency": {"id": db_constituency.id, "name": db_constituency.name} if db_constituency else None,
                "raw": address
            }
    except Exception as e:
        print(f"Reverse geocode error: {e}")
        return {"county": None, "constituency": None, "error": str(e)}
