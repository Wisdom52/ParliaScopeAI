from app.database import SessionLocal
from app.models.location import County, Constituency, Ward

KENYA_COUNTIES = [
    "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta", "Garissa", "Wajir", "Mandera", "Marsabit",
    "Isiolo", "Meru", "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua", "Nyeri", "Kirinyaga",
    "Murang'a", "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans-Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi", "Baringo",
    "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia",
    "Siaya", "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi"
]

# Simplified mapping of some wards for demonstration
COUNTY_WARD_SAMPLES = {
    "Nairobi": ["Kilimani", "Westlands", "Kasarani", "Embakasi", "Lang'ata", "Dagoretti"],
    "Mombasa": ["Nyali", "Likoni", "Mvita", "Kisauni", "Changamwe"],
    "Kisumu": ["Kisumu Central", "Kisumu East", "Kisumu West", "Nyando", "Muhoroni"],
    "Nakuru": ["Nakuru East", "Nakuru West", "Naivasha", "Gilgil", "Molo"],
    "Kiambu": ["Thika", "Ruiru", "Juja", "Kiambu Town", "Limuru"]
}

from app.database import SessionLocal, engine, Base
from app.models.location import County, Constituency, Ward

def seed_locations():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        if db.query(County).count() > 0:
            print("Locations already seeded.")
            return

        for county_name in KENYA_COUNTIES:
            county = County(name=county_name)
            db.add(county)
            db.flush() # Get ID
            
            # For simplicity in this demo, every county gets a "Main Town" constituency
            constituency = Constituency(name=f"{county_name} Central", county_id=county.id)
            db.add(constituency)
            db.flush()
            
            # Add wards if we have samples, otherwise add a generic one
            wards = COUNTY_WARD_SAMPLES.get(county_name, ["Main Ward", "Nodal Ward"])
            for ward_name in wards:
                ward = Ward(name=ward_name, constituency_id=constituency.id)
                db.add(ward)
        
        db.commit()
        print("Successfully seeded Kenya counties and sample wards.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding locations: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_locations()
