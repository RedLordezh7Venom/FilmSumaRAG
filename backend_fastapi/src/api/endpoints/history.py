from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from src.db.database import get_db
from src.models import sql_models, schemas

router = APIRouter()

@router.get("/{clerk_id}", response_model=List[schemas.ChatHistoryResponse])
def get_user_chat_history(clerk_id: str, db: Session = Depends(get_db)):
    db_user = db.query(sql_models.User).filter(sql_models.User.clerk_id == clerk_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return db.query(sql_models.ChatHistory).filter(sql_models.ChatHistory.user_id == db_user.id).order_by(sql_models.ChatHistory.created_at.desc()).all()

@router.get("/thread/all", response_model=List[schemas.ChatHistoryResponse])
def get_all_threads(clerk_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Return all chat messages across all threads, ordered by most recent first.
    The frontend groups these by thread_id to build the session list."""
    query = db.query(sql_models.ChatHistory)
    
    if clerk_id:
        user = db.query(sql_models.User).filter(sql_models.User.clerk_id == clerk_id).first()
        if not user:
            return []
        query = query.filter(sql_models.ChatHistory.user_id == user.id)
        
    return query.order_by(sql_models.ChatHistory.created_at.desc()).limit(500).all()

@router.get("/thread/{thread_id}", response_model=List[schemas.ChatHistoryResponse])
def get_thread_history(thread_id: str, clerk_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(sql_models.ChatHistory).filter(sql_models.ChatHistory.thread_id == thread_id)
    
    # Simple Auth check
    if clerk_id:
        user = db.query(sql_models.User).filter(sql_models.User.clerk_id == clerk_id).first()
        if user:
            query = query.filter(sql_models.ChatHistory.user_id == user.id)
        else:
            return [] # Invalid clerk_id
    else:
        # Strictly enforce that if no clerk_id is given, you can ONLY read guest threads
        query = query.filter(sql_models.ChatHistory.user_id == None)
            
    history = query.order_by(sql_models.ChatHistory.created_at.asc()).all()
    if not history: return []
    return history

@router.post("/chat-history", response_model=schemas.ChatHistoryResponse)
def save_chat_message(message: schemas.ChatHistoryCreate, db: Session = Depends(get_db)):
    new_msg = sql_models.ChatHistory(
        thread_id=message.thread_id,
        user_id=message.user_id,
        movie_id=message.movie_id,
        role=message.role,
        message=message.message,
        persona=message.persona
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg
