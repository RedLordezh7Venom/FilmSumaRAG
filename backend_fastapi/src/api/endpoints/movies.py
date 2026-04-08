from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import List
from src.db.database import get_db
from src.models import sql_models, schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.MovieResponse])
def list_movies(db: Session = Depends(get_db)):
    return db.query(sql_models.Movie).all()

@router.get("/collection")
def get_collection(db: Session = Depends(get_db)):
    """Return all movies with activity flags: summary, deep_dive threads, discussion posts."""
    movies = db.query(sql_models.Movie).all()
    result = []
    for movie in movies:
        summary_count = db.query(func.count(sql_models.SummaryCache.id)).filter(
            sql_models.SummaryCache.movie_id == movie.id
        ).scalar()
        
        deep_dive_count = db.query(func.count(distinct(sql_models.ChatHistory.thread_id))).filter(
            sql_models.ChatHistory.movie_id == movie.id
        ).scalar()
        
        discussion_count = db.query(func.count(sql_models.ForumPost.id)).filter(
            sql_models.ForumPost.movie_id == movie.id
        ).scalar()
        
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
        })
    return result

@router.get("/{movie_id}", response_model=schemas.MovieResponse)
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    return db.query(sql_models.Movie).get(movie_id)

