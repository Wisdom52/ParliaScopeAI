import requests
from sqlalchemy import create_engine, text
import time

BASE_URL = "http://localhost:8000"
DB_URL = "postgresql://postgres:postgres@localhost:5432/parliascope"
engine = create_engine(DB_URL)

# 1. Signup
print("Testing Signup...")
signup_response = requests.post(f"{BASE_URL}/auth/signup", json={
    "email": "pii_pg_test@example.com",
    "password": "password",
    "full_name": "Test PII PG",
    "id_number": "555666777"
})
print("Signup status:", signup_response.status_code)
if signup_response.status_code != 200:
    print(signup_response.text)

token = signup_response.json().get("access_token")

# 2. Check Database for Hashed ID
print("\nChecking database for hashed ID...")
with engine.connect() as conn:
    # Use raw SQL to fetch the record
    result = conn.execute(text("SELECT id, email, full_name, id_number FROM users WHERE email='pii_pg_test@example.com'")).fetchone()
    if result:
        user_id, email, full_name, id_number = result
        print(f"Stored email: {email}")
        print(f"Stored name: {full_name}")
        print(f"Stored id_number (should be hash): {id_number[:15]}...")
    else:
        print("User not found in Postgres!")

# 3. Test Delete Account Endpoint
print("\nTesting Account Deletion Endpoint...")
del_response = requests.delete(f"{BASE_URL}/auth/account", headers={"Authorization": f"Bearer {token}"})
print("Delete status:", del_response.status_code)
print("Delete response:", del_response.json())

# 4. Check Database again for anonymisation
print("\nChecking database for anonymisation...")
with engine.connect() as conn:
    result_after = conn.execute(text(f"SELECT email, full_name, id_number, hashed_password FROM users WHERE id={user_id}")).fetchone()
    if result_after:
        email, name, id_num, pswd = result_after
        print(f"Email after deletion: {email}")
        print(f"Name after deletion: {name}")
        print(f"ID Number after deletion: {id_num}")
        print(f"Password nullified: {pswd is None}")
    else:
        print("Record missing.")
