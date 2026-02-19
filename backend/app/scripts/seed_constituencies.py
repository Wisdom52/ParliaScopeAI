from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.location import County, Constituency

# Full list of 290 constituencies in Kenya by county
KENYA_CONSTITUENCIES = {
    "Mombasa": ["Changamwe", "Jomvu", "Kisauni", "Nyali", "Likoni", "Mvita"],
    "Kwale": ["Kinango", "Lunga Lunga", "Msambweni", "Matuga"],
    "Kilifi": ["Ganze", "Kaloleni", "Kilifi North", "Kilifi South", "Magarini", "Malindi", "Rabai"],
    "Tana River": ["Bura", "Garsen", "Galole"],
    "Lamu": ["Lamu East", "Lamu West"],
    "Taita Taveta": ["Mwatate", "Voi", "Wundanyi", "Taveta"],
    "Garissa": ["Daadab", "Fafi", "Garissa Township", "Hulugho", "Ijara", "Lagdera", "Balambala"],
    "Wajir": ["Eldas", "Tarbaj", "Wajir North", "Wajir East", "Wajir West", "Wajir South"],
    "Mandera": ["Mandera West", "Banissa", "Mandera North", "Mandera South", "Mandera East", "Lafey"],
    "Marsabit": ["Moyale", "North Horr", "Saku", "Laisamis"],
    "Isiolo": ["Isiolo North", "Isiolo South"],
    "Meru": ["Igembe South", "Igembe Central", "Igembe North", "Tigania West", "Tigania East", "North Imenti", "Buuri", "Central Imenti", "South Imenti"],
    "Tharaka-Nithi": ["Maara", "Chuka/Igambang'ombe", "Tharaka"],
    "Embu": ["Manyatta", "Mbeere North", "Mbeere South", "Runyenjes"],
    "Kitui": ["Mwingi North", "Mwingi West", "Mwingi Central", "Kitui West", "Kitui Rural", "Kitui Central", "Kitui East", "Kitui South"],
    "Machakos": ["Masinga", "Yatta", "Kangundo", "Matungulu", "Kathiani", "Mavoko", "Machakos Town", "Mwala"],
    "Makueni": ["Mbooni", "Kilome", "Kaiti", "Makueni", "Kibwezi East", "Kibwezi West"],
    "Nyandarua": ["Kinangop", "Kipipiri", "Ol Kalou", "Ol Jorok", "Ndaragwa"],
    "Nyeri": ["Tetu", "Kieni", "Mathira", "Othaya", "Mukurweini", "Nyeri Town"],
    "Kirinyaga": ["Kirinyaga Central", "Kirinyaga East", "Kirinyaga West", "Mwea"],
    "Murang'a": ["Kangema", "Mathioya", "Kiharu", "Kigumo", "Maragwa", "Kandara", "Gatanga"],
    "Kiambu": ["Gatundu South", "Gatundu North", "Juja", "Thika Town", "Ruiru", "Githunguri", "Kiambu", "Kiambaa", "Kabete", "Kikuyu", "Limuru", "Lari"],
    "Turkana": ["Turkana North", "Turkana West", "Turkana Central", "Loima", "Turkana South", "Turkana East"],
    "West Pokot": ["Kapenguria", "Sigor", "Kacheliba", "Pokot South"],
    "Samburu": ["Samburu West", "Samburu North", "Samburu East"],
    "Trans Nzoia": ["Kwanza", "Endebess", "Saboti", "Cherangany", "Kiminin"],
    "Uasin Gishu": ["Soy", "Ainabkoi", "Kapseret", "Kesses", "Moiben", "Turbo"],
    "Elgeyo Marakwet": ["Keiyo North", "Keiyo South", "Marakwet East", "Marakwet West"],
    "Nandi": ["Tinderet", "Aldai", "Nandi Hills", "Chesumei", "Mosop", "Emgwen"],
    "Baringo": ["Tiaty", "Baringo North", "Baringo Central", "Baringo South", "Mogotio", "Eldama Ravine"],
    "Laikipia": ["Laikipia West", "Laikipia East", "Laikipia North"],
    "Nakuru": ["Molo", "Njoro", "Naivasha", "Gilgil", "Kuresoi South", "Kuresoi North", "Subukia", "Rongai", "Bahati", "Nakuru Town West", "Nakuru Town East"],
    "Narok": ["Kilgoris", "Emurua Dikirr", "Narok North", "Narok East", "Narok South", "Narok West"],
    "Kajiado": ["Kajiado North", "Kajiado Central", "Kajiado South", "Kajiado West", "Kajiado East"],
    "Kericho": ["Ainamoi", "Belgut", "Bureti", "Kipkelion East", "Kipkelion West", "Soin/Sigowet"],
    "Bomet": ["Sotik", "Chepalungu", "Bomet East", "Bomet Central", "Konoin"],
    "Kakamega": ["Butere", "Mumias East", "Mumias West", "Matungu", "Khwisero", "Shinyalu", "Ikolomani", "Lurambi", "Navakholo", "Malava", "Lugari", "Likuyani"],
    "Vihiga": ["Sabatia", "Hamisi", "Luanda", "Emuhaya", "Vihiga"],
    "Bungoma": ["Bumula", "Kabuchai", "Kanduyi", "Kimilili", "Mt Elgon", "Sirisia", "Tongaren", "Webuye East", "Webuye West"],
    "Busia": ["Teso North", "Teso South", "Nambale", "Matayos", "Butula", "Funyula", "Budalangi"],
    "Siaya": ["Ugenya", "Ugunja", "Alego Usonga", "Gem", "Bondo", "Rarieda"],
    "Kisumu": ["Kisumu Central", "Kisumu East", "Kisumu West", "Muhoroni", "Nyakach", "Nyando", "Seme"],
    "Homa Bay": ["Kasipul", "Kabondo Kasipul", "Karachuonyo", "Rangwe", "Homa Bay Town", "Ndhiwa", "Suba North", "Suba South"],
    "Migori": ["Rongo", "Awendo", "Suna East", "Suna West", "Uriri", "Nyatike", "Kuria East", "Kuria West"],
    "Kisii": ["Bonchari", "South Mugirango", "Bomachoge Borabu", "Bobasi", "Bomachoge Chache", "Nyaribari Masaba", "Nyaribari Chache", "Kitutu Chache North", "Kitutu Chache South"],
    "Nyamira": ["Kitutu Masaba", "West Mugirango", "North Mugirango", "Borabu"],
    "Nairobi": ["Westlands", "Dagoretti North", "Dagoretti South", "Lang'ata", "Kibra", "Roysambu", "Kasarani", "Ruaraka", "Embakasi South", "Embakasi North", "Embakasi Central", "Embakasi East", "Embakasi West", "Makadara", "Kamukunji", "Starehe", "Mathare"]
}

from sqlalchemy import text

def seed_constituencies():
    db = SessionLocal()
    try:
        # Clear existing data
        db.execute(text("TRUNCATE counties, constituencies RESTART IDENTITY CASCADE;"))
        db.commit()
        
        for county_name, constituencies in KENYA_CONSTITUENCIES.items():
            county = County(name=county_name)
            db.add(county)
            db.flush()
            
            for const_name in constituencies:
                constituency = Constituency(name=const_name, county_id=county.id)
                db.add(constituency)
        
        db.commit()
        print(f"Successfully seeded {len(KENYA_CONSTITUENCIES)} counties and all constituencies.")
    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    seed_constituencies()
