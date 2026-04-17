from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import List, Optional
from pydantic import BaseModel
from src.db.database import get_db
from src.models import sql_models, schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.MovieResponse])
def list_movies(db: Session = Depends(get_db)):
    return db.query(sql_models.Movie).all()

class HideCollectionRequest(BaseModel):
    clerk_id: str
    movie_ids: List[int]
    unhide: Optional[bool] = False

@router.get("/collection")
def get_collection(
    clerk_id: Optional[str] = None, 
    show_hidden: bool = False, 
    db: Session = Depends(get_db)
):
    """Return collection items (summaries, chats, forum posts) scoped to the user if clerk_id is provided."""
    
    # 1. Resolve User
    user = None
    hidden_movie_ids = set()
    if clerk_id:
        user = db.query(sql_models.User).filter(sql_models.User.clerk_id == clerk_id).first()
        if user:
            hidden_records = db.query(sql_models.UserHiddenMovie).filter(sql_models.UserHiddenMovie.user_id == user.id).all()
            hidden_movie_ids = {r.movie_id for r in hidden_records}

    movies = db.query(sql_models.Movie).all()
    result = []
    for movie in movies:
        # If scoped to user, filter counts by user.id
        summary_q = db.query(func.count(sql_models.SummaryCache.id)).filter(sql_models.SummaryCache.movie_id == movie.id)
        deep_dive_q = db.query(func.count(distinct(sql_models.ChatHistory.thread_id))).filter(sql_models.ChatHistory.movie_id == movie.id)
        discussion_q = db.query(func.count(sql_models.ForumPost.id)).filter(sql_models.ForumPost.movie_id == movie.id)

        if user:
            deep_dive_q = deep_dive_q.filter(sql_models.ChatHistory.user_id == user.id)
            discussion_q = discussion_q.filter(sql_models.ForumPost.user_id == user.id)

        summary_count = summary_q.scalar()
        deep_dive_count = deep_dive_q.scalar()
        discussion_count = discussion_q.scalar()

        # Check Data Presence First
        if user:
            if deep_dive_count == 0 and discussion_count == 0:
                continue
        else:
            if summary_count == 0 and deep_dive_count == 0 and discussion_count == 0:
                continue

        # Check if movie is explicitly hidden
        is_hidden = movie.id in hidden_movie_ids
        if is_hidden and not show_hidden:
             continue
        if not is_hidden and show_hidden:
             continue

        result.append({
            "id": movie.id,
            "title": movie.title,
            "status": movie.status.value if movie.status else "pending",
            "created_at": movie.created_at.isoformat() if movie.created_at else None,
            "has_summary": summary_count > 0,
            "has_deep_dive": deep_dive_count > 0,
            "has_discussions": discussion_count > 0,
            "summary_count": summary_count,
            "deep_dive_threads": deep_dive_count,
            "discussion_posts": discussion_count,
            "is_hidden": is_hidden
        })
    return result

@router.post("/collection/hide")
def hide_movies(payload: HideCollectionRequest, db: Session = Depends(get_db)):
    user = db.query(sql_models.User).filter(sql_models.User.clerk_id == payload.clerk_id).first()
    if not user:
        return {"status": "error", "message": "User not found"}
        
    for mid in payload.movie_ids:
        existing = db.query(sql_models.UserHiddenMovie).filter(
            sql_models.UserHiddenMovie.user_id == user.id,
            sql_models.UserHiddenMovie.movie_id == mid
        ).first()
        
        if not payload.unhide and not existing:
            new_hide = sql_models.UserHiddenMovie(user_id=user.id, movie_id=mid)
            db.add(new_hide)
        elif payload.unhide and existing:
            db.delete(existing)
            
    db.commit()
    return {"status": "success"}

@router.post("/collection/delete")
def delete_movie_data(payload: HideCollectionRequest, db: Session = Depends(get_db)):
    user = db.query(sql_models.User).filter(sql_models.User.clerk_id == payload.clerk_id).first()
    if not user:
        return {"status": "error", "message": "User not found"}
        
    for mid in payload.movie_ids:
        # 1. Delete Chat History
        db.query(sql_models.ChatHistory).filter(
            sql_models.ChatHistory.user_id == user.id,
            sql_models.ChatHistory.movie_id == mid
        ).delete()
        
        # 2. Delete Hidden Ledger Records
        db.query(sql_models.UserHiddenMovie).filter(
            sql_models.UserHiddenMovie.user_id == user.id,
            sql_models.UserHiddenMovie.movie_id == mid
        ).delete()
        
        # Note: We are leaving ForumPosts intact for community history, 
        # but wiping personal generative history.

    db.commit()
    return {"status": "success", "deleted": payload.movie_ids}

@router.get("/id/{movie_id}", response_model=schemas.MovieResponse)
def get_movie_by_internal_id(movie_id: int, db: Session = Depends(get_db)):
    return db.query(sql_models.Movie).get(movie_id)

@router.get("/tmdb/{tmdb_id}", response_model=schemas.MovieResponse)
def get_movie_by_tmdb_id(tmdb_id: int, db: Session = Depends(get_db)):
    return db.query(sql_models.Movie).filter(sql_models.Movie.tmdb_id == tmdb_id).first()

