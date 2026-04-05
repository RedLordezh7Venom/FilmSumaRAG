from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from src.db.database import get_db
from src.models import sql_models, schemas

router = APIRouter()

@router.post("/sync-user", response_model=schemas.UserResponse)
def sync_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(sql_models.User).filter(sql_models.User.clerk_id == user.clerk_id).first()
    if db_user:
        # Update existing user if needed (e.g. email or username change)
        db_user.email = user.email
        db_user.username = user.username
        db.commit()
        db.refresh(db_user)
        return db_user
    
    # Create new user
    new_user = sql_models.User(
        clerk_id=user.clerk_id,
        email=user.email,
        username=user.username
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/user/{clerk_id}", response_model=schemas.UserResponse)
def get_user(clerk_id: str, db: Session = Depends(get_db)):
    db_user = db.query(sql_models.User).filter(sql_models.User.clerk_id == clerk_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
