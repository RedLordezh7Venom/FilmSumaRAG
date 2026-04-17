from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.db.database import get_db
from src.models import sql_models, schemas
from src.utils.logger import logger

router = APIRouter()

@router.post("/feedback/rate")
async def submit_feedback(payload: schemas.FeedbackRate, db: Session = Depends(get_db)):
    """
    Submit a thumbs up/down for a summary or deep dive response.
    Requires a signed-in user (identified by clerk_id).
    """
    # 1. Resolve user — must be logged in
    user = db.query(sql_models.User).filter(
        sql_models.User.clerk_id == payload.clerk_id
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please sign in to submit feedback.")

    # 2. Resolve movie by tmdb_id (reliable, no string matching)
    movie = db.query(sql_models.Movie).filter(
        sql_models.Movie.tmdb_id == payload.tmdb_id
    ).first()
    if not movie:
        raise HTTPException(status_code=404, detail=f"Movie with TMDB ID {payload.tmdb_id} not found in archive.")

    # 3. Save feedback
    feedback = sql_models.Feedback(
        user_id=user.id,
        movie_id=movie.id,
        chat_id=payload.chat_id,           # None for summary, set for deep dive
        rating=5 if payload.upvote else 1,  # 5 = good, 1 = bad for active learning
        downvote=not payload.upvote,
        comment=payload.comment,
        persona=payload.context,            # Store context ("summary" or "deep_dive")
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    arrow = "👍" if payload.upvote else "👎"
    logger.db(f"Feedback [{arrow}] for {movie.title} ({payload.context}) from user {user.id}")

    return {
        "status": "success",
        "feedback_id": feedback.id,
        "penalized": not payload.upvote
    }
