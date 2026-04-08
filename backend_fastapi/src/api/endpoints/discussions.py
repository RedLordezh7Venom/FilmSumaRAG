from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from src.db.database import get_db
from src.models import sql_models, schemas
import uuid
import random

router = APIRouter()

def generate_post_number():
    return f"No.{random.randint(10000000, 99999999)}"

@router.get("/boards")
def list_active_boards(db: Session = Depends(get_db)):
    """Return all movies that have at least one discussion post, with counts."""
    results = (
        db.query(
            sql_models.ForumPost.movie_id,
            sql_models.Movie.title,
            func.count(sql_models.ForumPost.id).label("post_count")
        )
        .join(sql_models.Movie, sql_models.ForumPost.movie_id == sql_models.Movie.id)
        .group_by(sql_models.ForumPost.movie_id, sql_models.Movie.title)
        .all()
    )
    return [
        {"movie_id": r.movie_id, "movie_title": r.title, "post_count": r.post_count}
        for r in results
    ]

@router.get("/boards/{movie_id}/posts", response_model=List[schemas.ForumPostResponse])
def get_movie_posts(movie_id: int, db: Session = Depends(get_db)):
    return db.query(sql_models.ForumPost).filter(sql_models.ForumPost.movie_id == movie_id).all()

@router.post("/boards/{movie_id}/posts", response_model=schemas.ForumPostResponse)
def create_post(movie_id: int, post: schemas.ForumPostCreate, db: Session = Depends(get_db)):
    # Verify movie exists, auto-create if not
    movie = db.query(sql_models.Movie).filter(sql_models.Movie.id == movie_id).first()
    if not movie:
        # Auto-create movie record so boards work for any TMDB movie
        movie = sql_models.Movie(
            id=movie_id,
            title=f"Movie #{movie_id}",
            status=sql_models.JobStatus.PENDING
        )
        db.add(movie)
        try:
            db.commit()
            db.refresh(movie)
        except Exception:
            db.rollback()
            # May fail if id conflicts; try fetching again
            movie = db.query(sql_models.Movie).filter(sql_models.Movie.id == movie_id).first()
            if not movie:
                raise HTTPException(status_code=500, detail="Failed to create movie record")
        
    db_user = None
    if post.clerk_id:
        db_user = db.query(sql_models.User).filter(sql_models.User.clerk_id == post.clerk_id).first()
        
    new_post = sql_models.ForumPost(
        post_number = generate_post_number(),
        movie_id = movie_id,
        user_id = db_user.id if db_user else None,
        title = post.title,
        content = post.content
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post


@router.post("/threads/{post_id}/replies", response_model=schemas.ForumReplyResponse)
def create_reply(post_id: int, reply: schemas.ForumReplyCreate, db: Session = Depends(get_db)):
    db_user = None
    if reply.clerk_id:
        db_user = db.query(sql_models.User).filter(sql_models.User.clerk_id == reply.clerk_id).first()

    new_reply = sql_models.ForumReply(
        reply_number = generate_post_number(),
        post_id = post_id,
        user_id = db_user.id if db_user else None,
        content = reply.content
    )
    db.add(new_reply)
    db.commit()
    db.refresh(new_reply)
    return new_reply
