from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.database import get_db
from app.models.user import User
from app.models.location import County, Constituency
from app.schemas import UserCreate, Token, UserLogin, User as UserSchema, UserUpdate
from app.core.security import verify_password, get_password_hash, create_access_token
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

@router.post("/signup", response_model=Token)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        print(f"Signup attempt for email: {user.email}")
        # Check if user exists (if email provided)
        if user.email:
            db_user = db.query(User).filter(User.email == user.email).first()
            if db_user:
                raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_password = get_password_hash(user.password) if user.password else None
        
        db_user = User(
            email=user.email,
            hashed_password=hashed_password,
            full_name=user.full_name,
            id_number=str(user.id_number) if user.id_number else None,
            county_id=user.county_id,
            constituency_id=user.constituency_id,
            latitude=str(user.latitude) if user.latitude else None,
            longitude=str(user.longitude) if user.longitude else None
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": str(db_user.id) if not db_user.email else db_user.email},  # Use ID or Email as subject
            expires_delta=access_token_expires
        )
        print("Signup successful")
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        import traceback
        print(f"Signup error: {e}")
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

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
    access_token_expires = timedelta(minutes=60 * 24 * 7) # Long lived token for convenience in MVP
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserSchema)
def get_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from jose import jwt
    from app.core.security import SECRET_KEY, ALGORITHM
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Add location names to the response
    if user.county_id:
        county = db.query(County).filter(County.id == user.county_id).first()
        if county:
            user.county_name = county.name
    
    if user.constituency_id:
        constituency = db.query(Constituency).filter(Constituency.id == user.constituency_id).first()
        if constituency:
            user.constituency_name = constituency.name
            
    return user

@router.patch("/profile", response_model=UserSchema)
def update_profile(
    user_update: UserUpdate, 
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
):
    from jose import jwt
    from app.core.security import SECRET_KEY, ALGORITHM
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    
    # Reload location names for the response
    if user.county_id:
        county = db.query(County).filter(County.id == user.county_id).first()
        if county:
            user.county_name = county.name
    if user.constituency_id:
        constituency = db.query(Constituency).filter(Constituency.id == user.constituency_id).first()
        if constituency:
            user.constituency_name = constituency.name
            
    return user
