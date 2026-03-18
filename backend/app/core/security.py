from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import jwt
from passlib.context import CryptContext
import os
from cryptography.fernet import Fernet

FERNET_KEY = os.environ.get("FERNET_KEY")
if not FERNET_KEY:
    FERNET_KEY = Fernet.generate_key()
    os.environ["FERNET_KEY"] = FERNET_KEY.decode()

fernet = Fernet(FERNET_KEY)

# Openssl command to generate a secret key: openssl rand -hex 32
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- PII Pseudonymisation ---

def hash_id_number(id_number: str) -> str:
    """
    One-way hash a National ID number using pbkdf2_sha256 before storage.
    This means the raw ID number is never stored in plain text in the database.
    """
    return pwd_context.hash(id_number)

def verify_id_number(plain_id: str, hashed_id: str) -> bool:
    """
    Verify a National ID number against its stored hash.
    Useful for future identity verification flows without storing the raw number.
    """
    return pwd_context.verify(plain_id, hashed_id)

def encrypt_pii(data: str) -> str:
    """
    Encrypt sensitive PII using Fernet symmetric encryption.
    """
    if not data:
        return data
    return fernet.encrypt(data.encode()).decode()

def decrypt_pii(encrypted_data: str) -> str:
    """
    Decrypt sensitive PII. Returns original string if decryption fails.
    """
    if not encrypted_data:
        return encrypted_data
    try:
        return fernet.decrypt(encrypted_data.encode()).decode()
    except Exception:
        return encrypted_data
