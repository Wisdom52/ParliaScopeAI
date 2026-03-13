from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.database import get_db
from app.models.user import User
from app.models.location import County, Constituency
from app.schemas import UserCreate, Token, UserLogin, User as UserSchema, UserUpdate
from app.core.security import verify_password, get_password_hash, create_access_token, hash_id_number
from app.core.logger import logger
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

@router.post("/signup", response_model=Token)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        logger.info(f"Signup attempt for email: {user.email}")
        # Check if user exists (if email provided)
        if user.email:
            db_user = db.query(User).filter(User.email == user.email).first()
            if db_user:
                raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_password = get_password_hash(user.password) if user.password else None
        
        # Hash the National ID before storage (PII pseudonymisation)
        hashed_id = hash_id_number(str(user.id_number)) if user.id_number else None

        db_user = User(
            email=user.email,
            hashed_password=hashed_password,
            full_name=user.full_name,
            id_number=hashed_id,
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
        logger.info(f"Signup successful for email: {user.email}")
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        logger.error(f"Signup error: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm expects 'username', mapping it to email
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Forensic Audit: Failed login attempt for email: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning(f"Login attempt blocked for paused account: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been paused by an administrator. Please contact support."
        )

    access_token_expires = timedelta(minutes=60 * 24 * 7) # Long lived token for convenience in MVP
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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
        
    if not user.is_active:
        logger.warning(f"Authenticated access blocked for paused account: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Account is paused. Access revoked."
        )
        
    return user

optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

def get_current_user_optional(token: str = Depends(optional_oauth2_scheme), db: Session = Depends(get_db)):
    """
    Optional dependency to identify the user if a token is present, 
    but does not raise an error if not authenticated.
    """
    if not token:
        return None
        
    from jose import jwt
    from app.core.security import SECRET_KEY, ALGORITHM
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        user = db.query(User).filter(User.email == email).first()
        return user if user and user.is_active else None
    except Exception:
        return None

def get_current_admin_user(current_user: User = Depends(get_current_user)):
    """
    Dependency to ensure the current authenticated user is an administrator.
    """
    if not current_user.is_admin:
        from app.core.logger import logger
        logger.warning(f"Unauthorized admin access attempt by user: {current_user.email}")
        raise HTTPException(
            status_code=403, 
            detail="The current user does not have sufficient permissions to access this resource."
        )
    return current_user

@router.get("/me", response_model=UserSchema)
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
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
    user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    
    update_data = user_update.dict(exclude_unset=True)

    # Hash the National ID if it is being updated
    if 'id_number' in update_data and update_data['id_number']:
        update_data['id_number'] = hash_id_number(str(update_data['id_number']))

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

@router.delete("/account", status_code=200)
def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Anonymises all PII for the authenticated user (Right to Erasure).
    The account record remains in the DB for relational integrity but all
    personally identifiable data is replaced with anonymised placeholders.
    """
    user.email = f"deleted_{user.id}@anon.parlsco"
    user.full_name = "[Deleted User]"
    user.id_number = None
    user.hashed_password = None  # Lock the account
    user.latitude = None
    user.longitude = None
    user.whatsapp_number = None
    user.push_token = None

    db.commit()
    return {"detail": "Account successfully deleted and all personal data anonymised."}
