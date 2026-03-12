import requests
import sqlite3
import time
import os

BASE_URL = "http://localhost:8000"
DB_PATH = "c:/Users/Admin/Documents/ParliaScopeAI/backend/parliascope.db"

# 1. Signup
print("Testing Signup...")
signup_response = requests.post(f"{BASE_URL}/auth/signup", json={
    "email": "pii_test2@example.com",
    "password": "password",
    "full_name": "Test PII",
    "id_number": "987654321"
})
print("Signup status:", signup_response.status_code)
token = signup_response.json().get("access_token")

# 2. Check Database for Hashed ID
print("\nChecking database for hashed ID...")
# Give it a second to commit
time.sleep(1)
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("SELECT id, email, full_name, id_number FROM users WHERE email='pii_test2@example.com'")
row = cursor.fetchone()
if row:
    user_id, email, full_name, id_number = row
    print(f"Stored email: {email}")
    print(f"Stored name: {full_name}")
    print(f"Stored id_number (should be hash): {id_number}")
else:
    print("User not found in DB!")

# 3. Test Delete Account Endpoint
print("\nTesting Account Deletion Endpoint...")
del_response = requests.delete(f"{BASE_URL}/auth/account", headers={"Authorization": f"Bearer {token}"})
print("Delete status:", del_response.status_code)
print("Delete response:", del_response.json())

# 4. Check Database again for anonymisation
print("\nChecking database for anonymisation...")
cursor.execute("SELECT email, full_name, id_number, hashed_password FROM users WHERE id=?", (user_id,))
row_after = cursor.fetchone()
if row_after:
    new_email, new_name, new_id, new_pass = row_after
    print(f"Email after deletion: {new_email}")
    print(f"Name after deletion: {new_name}")
    print(f"ID Number after deletion: {new_id}")
    print(f"Password nullified: {new_pass is None}")
else:
    print("User record completely missing (should not happen, expected anonymisation).")

conn.close()
