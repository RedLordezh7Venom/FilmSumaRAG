from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.db.database import get_db
from src.models import sql_models, schemas

router = APIRouter()

@router.post("/feedback")
async def submit_feedback(payload: schemas.FeedbackBase, db: Session = Depends(get_db)):
    # 1. Find user
    user = db.query(sql_models.User).filter(sql_models.User.clerk_id == payload.clerk_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Find movie
    movie = db.query(sql_models.Movie).filter(sql_models.Movie.title == payload.movie_title).first()
    if not movie:
         raise HTTPException(status_code=404, detail="Movie not found")

    # 3. Save feedback
    feedback = sql_models.Feedback(
        user_id=user.id,
        movie_id=movie.id,
        chat_id=payload.chat_id,
        rating=payload.rating,
        comment=payload.comment,
        persona=payload.persona
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return {"status": "success", "feedback_id": feedback.id}
