from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from src.db.database import get_db
from src.models import sql_models, schemas
import uuid
import random

router = APIRouter()

def generate_post_number():
    return f"No.{random.randint(10000000, 99999999)}"

@router.get("/boards/{movie_id}/posts", response_model=List[schemas.ForumPostResponse])
def get_movie_posts(movie_id: int, db: Session = Depends(get_db)):
    return db.query(sql_models.ForumPost).filter(sql_models.ForumPost.movie_id == movie_id).all()

@router.post("/boards/{movie_id}/posts", response_model=schemas.ForumPostResponse)
def create_post(movie_id: int, post: schemas.ForumPostCreate, db: Session = Depends(get_db)):
    # Verify movie exists
    movie = db.query(sql_models.Movie).filter(sql_models.Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
        
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
