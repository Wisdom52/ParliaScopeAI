from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.database import get_db
from app.models.user import User
from app.schemas import UserCreate, Token, UserLogin, User as UserSchema
from app.core.security import verify_password, get_password_hash, create_access_token
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

@router.post("/signup", response_model=Token)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists (if email provided)
    if user.email:
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password) if user.password else None
    
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        county_id=user.county_id,
        ward_id=user.ward_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": str(db_user.id) if not db_user.email else db_user.email},  # Use ID or Email as subject
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm expects 'username', mapping it to email
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
