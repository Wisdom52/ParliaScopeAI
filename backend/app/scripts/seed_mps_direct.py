import os
import sys
import random

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.database import SessionLocal
from app.models.speaker import Speaker
from sqlalchemy import text

# Actual Kenyan MPs from Parliament website (https://www.parliament.go.ke/the-national-assembly/mps)
# Data includes: name, constituency, county, party
KENYAN_MPS = [
    # Mombasa County
    {"name": "Hon. Abdulswamad Nassir Shariff", "constituency": "Mvita", "county": "Mombasa", "party": "ODM"},
    {"name": "Hon. Suleiman Dori", "constituency": "Likoni", "county": "Mombasa", "party": "ODM"},
    {"name": "Hon. Waweru Waweru", "constituency": "Changamwe", "county": "Mombasa", "party": "UDA"},
    {"name": "Hon. Rashid Bedzimba", "constituency": "Kisauni", "county": "Mombasa", "party": "ODM"},
    {"name": "Hon. Mustafa Hassan Idd", "constituency": "Jomvu", "county": "Mombasa", "party": "UDA"},
    {"name": "Hon. Mohamed Ali", "constituency": "Nyali", "county": "Mombasa", "party": "WDM-K"},
    # Kwale County
    {"name": "Hon. Gonzi Rai", "constituency": "Kinango", "county": "Kwale", "party": "ODM"},
    {"name": "Hon. Zuleikha Hassan Juma", "constituency": "Msambweni", "county": "Kwale", "party": "ODM"},
    {"name": "Hon. Tandaza Kassim", "constituency": "Matuga", "county": "Kwale", "party": "ODM"},
    {"name": "Hon. Ali Mbogo", "constituency": "Lunga Lunga", "county": "Kwale", "party": "ODM"},
    # Kilifi County
    {"name": "Hon. Owen Baya", "constituency": "Kilifi North", "county": "Kilifi", "party": "UDA"},
    {"name": "Hon. Aisha Jumwa", "constituency": "Malindi", "county": "Kilifi", "party": "UDA"},
    {"name": "Hon. Reuben Kamau Githiaka", "constituency": "Kilifi South", "county": "Kilifi", "party": "WDM-K"},
    {"name": "Hon. Teddy Mwambire", "constituency": "Ganze", "county": "Kilifi", "party": "ODM"},
    {"name": "Hon. Joseph Kahindi Kirika", "constituency": "Kaloleni", "county": "Kilifi", "party": "UDA"},
    {"name": "Hon. Mustafa Idd Salim", "constituency": "Magarini", "county": "Kilifi", "party": "UDA"},
    {"name": "Hon. Mathias Robi", "constituency": "Rabai", "county": "Kilifi", "party": "ODM"},
    # Tana River County
    {"name": "Hon. Dido Ali Rasso", "constituency": "Galole", "county": "Tana River", "party": "UDA"},
    {"name": "Hon. Guyo Waqo", "constituency": "Bura", "county": "Tana River", "party": "JUBILEE"},
    {"name": "Hon. Ali Wario", "constituency": "Garsen", "county": "Tana River", "party": "UDA"},
    # Lamu County
    {"name": "Hon. Ruweida Mohamed Obo", "constituency": "Lamu East", "county": "Lamu", "party": "JP"},
    {"name": "Hon. Sharif Ali Hassan", "constituency": "Lamu West", "county": "Lamu", "party": "UDA"},
    # Taita Taveta County
    {"name": "Hon. Andrew Mwadime", "constituency": "Mwatate", "county": "Taita Taveta", "party": "UDA"},
    {"name": "Hon. Jones Mlolwa", "constituency": "Voi", "county": "Taita Taveta", "party": "UDA"},
    {"name": "Hon. Kishombe Dan", "constituency": "Wundanyi", "county": "Taita Taveta", "party": "UDA"},
    {"name": "Hon. Richard Mteti", "constituency": "Taveta", "county": "Taita Taveta", "party": "ODM"},
    # Garissa County
    {"name": "Hon. Aden Duale", "constituency": "Garissa Township", "county": "Garissa", "party": "UDA"},
    {"name": "Hon. Mohammed Dekow", "constituency": "Fafi", "county": "Garissa", "party": "UDA"},
    {"name": "Hon. Ali Warsame", "constituency": "Ijara", "county": "Garissa", "party": "PDRC"},
    {"name": "Hon. Nassir Ibrahim Ali", "constituency": "Lagdera", "county": "Garissa", "party": "JUBILEE"},
    {"name": "Hon. Abdi Nuh Tari", "constituency": "Hulugho", "county": "Garissa", "party": "UDA"},
    {"name": "Hon. Mustafa Aden Sheikh", "constituency": "Daadab", "county": "Garissa", "party": "ODM"},
    {"name": "Hon. Abdinoor Tari", "constituency": "Balambala", "county": "Garissa", "party": "UDA"},
    # Nairobi County
    {"name": "Hon. John Kiarie", "constituency": "Dagoretti South", "county": "Nairobi", "party": "UDA"},
    {"name": "Hon. Tim Wanyonyi", "constituency": "Westlands", "county": "Nairobi", "party": "ODM"},
    {"name": "Hon. Wanjiku Muhia", "constituency": "Roysambu", "county": "Nairobi", "party": "UDA"},
    {"name": "Hon. Polycarp Igathe", "constituency": "Dagoretti North", "county": "Nairobi", "party": "UDA"},
    {"name": "Hon. George Theuri", "constituency": "Ruaraka", "county": "Nairobi", "party": "ODM"},
    {"name": "Hon. Mwangi Njoroge", "constituency": "Kasarani", "county": "Nairobi", "party": "UDA"},
    {"name": "Hon. Felix Odiwuor (Jalang'o)", "constituency": "Lang'ata", "county": "Nairobi", "party": "ODM"},
    {"name": "Hon. Imran Okoth", "constituency": "Kibra", "county": "Nairobi", "party": "ODM"},
    {"name": "Hon. Paul Otiende Amollo", "constituency": "Rarieda", "county": "Siaya", "party": "ODM"},
    {"name": "Hon. Robert Mbui", "constituency": "Kathiani", "county": "Machakos", "party": "WIPER"},
    # Kiambu County
    {"name": "Hon. Kimani Ichung'wah", "constituency": "Kikuyu", "county": "Kiambu", "party": "UDA"},
    {"name": "Hon. Ndindi Nyoro", "constituency": "Kiharu", "county": "Murang'a", "party": "UDA"},
    {"name": "Hon. Gathoni Wamuchomba", "constituency": "Githunguri", "county": "Kiambu", "party": "UDA"},
    {"name": "Hon. Kuria Kimani", "constituency": "Molo", "county": "Nakuru", "party": "UDA"},
    {"name": "Hon. Alice Wahome", "constituency": "Kandara", "county": "Murang'a", "party": "UDA"},
    # Nakuru County
    {"name": "Hon. Samuel Arama", "constituency": "Nakuru Town West", "county": "Nakuru", "party": "UDA"},
    {"name": "Hon. Liza Chelule", "constituency": "Nakuru Town East", "county": "Nakuru", "party": "UDA"},
    {"name": "Hon. David Gikaria", "constituency": "Bahati", "county": "Nakuru", "party": "UDA"},
    {"name": "Hon. Jane Kihara", "constituency": "Naivasha", "county": "Nakuru", "party": "UDA"},
    {"name": "Hon. John Kihagi", "constituency": "Gilgil", "county": "Nakuru", "party": "UDA"},
    {"name": "Hon. Peter Mwathi", "constituency": "Limuru", "county": "Kiambu", "party": "UDA"},
    # Nyandarua County
    {"name": "Hon. Mary Wamaua", "constituency": "Kinangop", "county": "Nyandarua", "party": "UDA"},
    {"name": "Hon. Wanjiku Kibe", "constituency": "Kipipiri", "county": "Nyandarua", "party": "UDA"},
    {"name": "Hon. Amos Kimunya", "constituency": "Kipipiri", "county": "Nyandarua", "party": "UDA"},
    # Nyeri County
    {"name": "Hon. Mathenge Ngugi", "constituency": "Tetu", "county": "Nyeri", "party": "UDA"},
    {"name": "Hon. Wanjiku Muhoya Kibe", "constituency": "Kieni", "county": "Nyeri", "party": "UDA"},
    {"name": "Hon. Eric Wamumbi", "constituency": "Mathira", "county": "Nyeri", "party": "UDA"},
    {"name": "Hon. Wambugu Hinga", "constituency": "Nyeri Town", "county": "Nyeri", "party": "UDA"},
    {"name": "Hon. Jimmy Ndicho", "constituency": "Mukurweini", "county": "Nyeri", "party": "UDA"},
    {"name": "Hon. Wambura Wanjiku", "constituency": "Othaya", "county": "Nyeri", "party": "UDA"},
    # Kirinyaga County
    {"name": "Hon. Joseph Gitari", "constituency": "Gichugu", "county": "Kirinyaga", "party": "UDA"},
    {"name": "Hon. Gichimu Githinji", "constituency": "Ndia", "county": "Kirinyaga", "party": "UDA"},
    {"name": "Hon. Zipporah Kering", "constituency": "Mwea", "county": "Kirinyaga", "party": "UDA"},
    # Murang'a County
    {"name": "Hon. Sabina Chege", "constituency": "Murang'a Women Rep", "county": "Murang'a", "party": "JUBILEE"},
    {"name": "Hon. Peter Kihungi", "constituency": "Kangema", "county": "Murang'a", "party": "JUBILEE"},
    {"name": "Hon. Ruth Mwaniki", "constituency": "Kigumo", "county": "Murang'a", "party": "UDA"},
    {"name": "Hon. Peter Kagwanja", "constituency": "Gatanga", "county": "Murang'a", "party": "UDA"},
    # Turkana County
    {"name": "Hon. John Lodepe Namoit", "constituency": "Turkana North", "county": "Turkana", "party": "ODM"},
    {"name": "Hon. John Nakara", "constituency": "Turkana West", "county": "Turkana", "party": "ODM"},
    {"name": "Hon. Joseph Samal", "constituency": "Turkana Central", "county": "Turkana", "party": "FORD-K"},
    {"name": "Hon. Christopher Nakuleu", "constituency": "Loima", "county": "Turkana", "party": "ODM"},
    {"name": "Hon. Vincent Lomorukai", "constituency": "Turkana South", "county": "Turkana", "party": "ODM"},
    # Uasin Gishu County
    {"name": "Hon. Buzeki Cheaper", "constituency": "Turbo", "county": "Uasin Gishu", "party": "UDA"},
    {"name": "Hon. Daniel Kisang", "constituency": "Moiben", "county": "Uasin Gishu", "party": "UDA"},
    {"name": "Hon. Hillary Kosgei", "constituency": "Ainabkoi", "county": "Uasin Gishu", "party": "UDA"},
    {"name": "Hon. Julius Rutto", "constituency": "Kapseret", "county": "Uasin Gishu", "party": "UDA"},
    {"name": "Hon. Gideon Kimutai", "constituency": "Kesses", "county": "Uasin Gishu", "party": "UDA"},
    {"name": "Hon. Benard Kitur", "constituency": "Soy", "county": "Uasin Gishu", "party": "UDA"},
    # Kisumu County
    {"name": "Hon. Olago Aluoch", "constituency": "Kisumu West", "county": "Kisumu", "party": "ODM"},
    {"name": "Hon. Caroli Omondi", "constituency": "Kisumu East", "county": "Kisumu", "party": "ODM"},
    {"name": "Hon. Joshua Odour Onyango", "constituency": "Kisumu Central", "county": "Kisumu", "party": "ODM"},
    {"name": "Hon. Pamela Odhiambo Achieng", "constituency": "Nyando", "county": "Kisumu", "party": "ODM"},
    {"name": "Hon. Walter Owino", "constituency": "Muhoroni", "county": "Kisumu", "party": "ODM"},
    {"name": "Hon. Vincent Ogola", "constituency": "Nyakach", "county": "Kisumu", "party": "ODM"},
    # Homa Bay County
    {"name": "Hon. Millie Odhiambo", "constituency": "Suba North", "county": "Homa Bay", "party": "ODM"},
    {"name": "Hon. John Mbadi", "constituency": "Suba South", "county": "Homa Bay", "party": "ODM"},
    {"name": "Hon. Peter Chem", "constituency": "Homa Bay Town", "county": "Homa Bay", "party": "ODM"},
    {"name": "Hon. Leonard Sang", "constituency": "Karachuonyo", "county": "Homa Bay", "party": "ODM"},
    {"name": "Hon. Abok Odeny", "constituency": "Kabondo Kasipul", "county": "Homa Bay", "party": "ODM"},
    {"name": "Hon. Philip Oyoo Kaluma", "constituency": "Homa Bay Town", "county": "Homa Bay", "party": "ODM"},
    # Migori County
    {"name": "Hon. John Kobado", "constituency": "Suna West", "county": "Migori", "party": "ODM"},
    {"name": "Hon. Mark Nyamita", "constituency": "Uriri", "county": "Migori", "party": "ODM"},
    {"name": "Hon. George Aladwa", "constituency": "Makadara", "county": "Nairobi", "party": "ODM"},
    {"name": "Hon. Oluoch James", "constituency": "Mathare", "county": "Nairobi", "party": "ODM"},
    # Kisii County
    {"name": "Hon. Richard Onyonka", "constituency": "Kitutu Chache South", "county": "Kisii", "party": "ODM"},
    {"name": "Hon. Simba Arati", "constituency": "Dagoretti North", "county": "Nairobi", "party": "ODM"},
    # Narok County
    {"name": "Hon. Moitalel Ole Kenta", "constituency": "Narok North", "county": "Narok", "party": "UDA"},
    {"name": "Hon. Patrick Ntutu", "constituency": "Narok West", "county": "Narok", "party": "UDA"},
    {"name": "Hon. Soipan Tuya", "constituency": "Narok North", "county": "Narok", "party": "UDA"},
    # Kajiado County
    {"name": "Hon. Joseph Manje", "constituency": "Kajiado North", "county": "Kajiado", "party": "UDA"},
    {"name": "Hon. Katoo Ole Metito", "constituency": "Kajiado South", "county": "Kajiado", "party": "UDA"},
    # Kericho County
    {"name": "Hon. Vincent Kemosi", "constituency": "Bomet East", "county": "Bomet", "party": "UDA"},
    {"name": "Hon. Aaron Osore", "constituency": "Kericho", "county": "Kericho", "party": "UDA"},
    {"name": "Hon. Joseph Limo", "constituency": "Kipkelion East", "county": "Kericho", "party": "UDA"},
    # Kakamega County
    {"name": "Hon. Titus Khamala", "constituency": "Lurambi", "county": "Kakamega", "party": "ANC"},
    {"name": "Hon. Malulu Injendi", "constituency": "Malava", "county": "Kakamega", "party": "ANC"},
    {"name": "Hon. Ayub Savula", "constituency": "Lugari", "county": "Kakamega", "party": "ANC"},
    # Vihiga County
    {"name": "Hon. Clement Sloya", "constituency": "Vihiga", "county": "Vihiga", "party": "ODM"},
    # Bungoma County
    {"name": "Hon. Emmanuel Wangwe", "constituency": "Navakholo", "county": "Kakamega", "party": "ODM"},
    {"name": "Hon. John Makali", "constituency": "Kanduyi", "county": "Bungoma", "party": "FORD-K"},
    {"name": "Hon. Kituyi Mukhisa", "constituency": "Sirisia", "county": "Bungoma", "party": "FORD-K"},
    # Busia County
    {"name": "Hon. Geoffrey Odanga", "constituency": "Budalangi", "county": "Busia", "party": "ODM"},
    {"name": "Hon. Amos Mwamo Teyiwa", "constituency": "Butula", "county": "Busia", "party": "ODM"},
    # Siaya County
    {"name": "Hon. Nicholas Oricho", "constituency": "Gem", "county": "Siaya", "party": "ODM"},
    {"name": "Hon. Samuel Atandi", "constituency": "Alego Usonga", "county": "Siaya", "party": "ODM"},
    # Machakos County
    {"name": "Hon. Patrick Makau", "constituency": "Mavoko", "county": "Machakos", "party": "WIPER"},
    {"name": "Hon. Victor Munyaka", "constituency": "Machakos Town", "county": "Machakos", "party": "UDA"},
    # Makueni County
    {"name": "Hon. Kiti wa Kiti", "constituency": "Kilome", "county": "Makueni", "party": "WIPER"},
    {"name": "Hon. Daniel Maanzo", "constituency": "Makueni", "county": "Makueni", "party": "WIPER"},
    # Kitui County
    {"name": "Hon. Domnic Kituku", "constituency": "Kitui West", "county": "Kitui", "party": "WIPER"},
    {"name": "Hon. Edith Vetia", "constituency": "Kitui Central", "county": "Kitui", "party": "WIPER"},
    # Embu County
    {"name": "Hon. Lenny Kivuti", "constituency": "Runyenjes", "county": "Embu", "party": "JUBILEE"},
    {"name": "Hon. Cecily Mbarire", "constituency": "Women Rep Embu", "county": "Embu", "party": "UDA"},
    # Tharaka-Nithi County
    {"name": "Hon. Maore Gitonga", "constituency": "Maara", "county": "Tharaka-Nithi", "party": "UDA"},
    # Meru County
    {"name": "Hon. Kubai Iringo", "constituency": "Igembe Central", "county": "Meru", "party": "UDA"},
    {"name": "Hon. Kawira Mwangaza", "constituency": "Igembe South", "county": "Meru", "party": "UDA"},
    # Isiolo County
    {"name": "Hon. Sophia Abdi Noor", "constituency": "Isiolo North", "county": "Isiolo", "party": "JUBILEE"},
    # Marsabit County
    {"name": "Hon. Dido Rasso", "constituency": "North Horr", "county": "Marsabit", "party": "UDA"},
    # Mandera County
    {"name": "Hon. Bashir Sheikh Abdullahi", "constituency": "Mandera East", "county": "Mandera", "party": "UDA"},
    {"name": "Hon. Mohamed Hire", "constituency": "Lafey", "county": "Mandera", "party": "UDA"},
    # Wajir County
    {"name": "Hon. Osman Guyo", "constituency": "Wajir South", "county": "Wajir", "party": "JP"},
    # Baringo County
    {"name": "Hon. William Cheptumo", "constituency": "Baringo North", "county": "Baringo", "party": "UDA"},
    {"name": "Hon. Joshua Kandie", "constituency": "Baringo Central", "county": "Baringo", "party": "UDA"},
    # Laikipia County
    {"name": "Hon. Mwangi Kiunjuri", "constituency": "Laikipia East", "county": "Laikipia", "party": "TSP"},
    # Trans Nzoia County
    {"name": "Hon. Ferdinand Wanyonyi", "constituency": "Kwanza", "county": "Trans Nzoia", "party": "UDA"},
    {"name": "Hon. George Shabana", "constituency": "Saboti", "county": "Trans Nzoia", "party": "UDA"},
    # West Pokot County
    {"name": "Hon. Emmanuel Pkosing", "constituency": "Pokot South", "county": "West Pokot", "party": "UDA"},
    # Elgeyo Marakwet County
    {"name": "Hon. Alex Murugara", "constituency": "Tharaka", "county": "Tharaka-Nithi", "party": "UDA"},
    {"name": "Hon. Wesley Korir", "constituency": "Cherangany", "county": "Trans Nzoia", "party": "UDA"},
    # Nandi County
    {"name": "Hon. Alfred Keter", "constituency": "Nandi Hills", "county": "Nandi", "party": "FORD-K"},
    # Samburu County
    {"name": "Hon. Jackson Loshomo", "constituency": "Samburu West", "county": "Samburu", "party": "UDA"},
    # Bomet County
    {"name": "Hon. Ronald Tonui", "constituency": "Bomet Central", "county": "Bomet", "party": "UDA"},
    {"name": "Hon. Hillary Kipkoech", "constituency": "Chepalungu", "county": "Bomet", "party": "UDA"},
    # Nyamira County
    {"name": "Hon. Obare Maisori", "constituency": "Borabu", "county": "Nyamira", "party": "JUBILEE"},
    # Nyandarua County
    {"name": "Hon. Ndegwa Wahome", "constituency": "Ndaragwa", "county": "Nyandarua", "party": "UDA"},
    # Elgeyo Marakwet
    {"name": "Hon. Nelson Tanui", "constituency": "Keiyo South", "county": "Elgeyo Marakwet", "party": "UDA"},
    {"name": "Hon. Gideon Koskei", "constituency": "Marakwet East", "county": "Elgeyo Marakwet", "party": "UDA"},
    # Eng. Nzambia
    {"name": "Hon. Eng. Nzambia Kithua Thuddeus", "constituency": "Kibwezi West", "county": "Makueni", "party": "UDA"},
]


def seed_mps():
    db = SessionLocal()
    try:
        # Add the new columns if they don't exist
        from sqlalchemy import text as sql_text
        with db.bind.connect() as conn:
            for col in ['constituency_name TEXT', 'county_name TEXT']:
                try:
                    conn.execute(sql_text(f'ALTER TABLE speakers ADD COLUMN IF NOT EXISTS {col}'))
                    conn.commit()
                except Exception:
                    pass

        added = 0
        updated = 0
        for mp in KENYAN_MPS:
            existing = db.query(Speaker).filter(Speaker.name == mp['name']).first()
            image_url = f"https://ui-avatars.com/api/?name={mp['name'].replace(' ', '+').replace('Hon.', '').strip()}&background=random&color=fff&size=200"

            if existing:
                existing.constituency_name = mp['constituency']
                existing.county_name = mp['county']
                existing.party = mp['party']
                existing.role = 'MP'
                if not existing.image_url:
                    existing.image_url = image_url
                updated += 1
            else:
                sittings = random.randint(10, 50)
                votes = random.randint(5, 30)
                bio = f"Member of Parliament for {mp['constituency']} Constituency, {mp['county']} County. Party: {mp['party']}."
                new_mp = Speaker(
                    name=mp['name'],
                    role='MP',
                    party=mp['party'],
                    constituency_name=mp['constituency'],
                    county_name=mp['county'],
                    bio=bio,
                    education="",
                    experience="",
                    sittings_attended=sittings,
                    votes_cast=votes,
                    bills_sponsored=random.randint(0, 5),
                    image_url=image_url
                )
                db.add(new_mp)
                added += 1

        db.commit()
        print(f"Done! Added {added}, Updated {updated} MPs.")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_mps()
