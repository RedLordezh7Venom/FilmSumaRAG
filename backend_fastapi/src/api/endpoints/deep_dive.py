from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from src.core.rag_chat import answer_question_stream
from src.db.database import get_db
from src.models import sql_models
from sqlalchemy.orm import Session
import json
from typing import Optional

router = APIRouter()

class ChatQuery(BaseModel):
    movie: str
    question: str
    thread_id: str
    persona: str = "critic"
    clerk_id: Optional[str] = None

@router.post("/deep_dive")
async def deep_dive_chat(payload: ChatQuery, db: Session = Depends(get_db)):
    try:
        # Link user if clerk_id provided
        db_user = None
        if payload.clerk_id:
            db_user = db.query(sql_models.User).filter(sql_models.User.clerk_id == payload.clerk_id).first()
        
        # Ensure movie exists
        db_movie = db.query(sql_models.Movie).filter(sql_models.Movie.title == payload.movie).first()
        if not db_movie:
            db_movie = sql_models.Movie(title=payload.movie, status=sql_models.JobStatus.PENDING)
            db.add(db_movie)
            db.commit()
            db.refresh(db_movie)
        
        # Save user message to history
        user_msg = sql_models.ChatHistory(
            thread_id=payload.thread_id,
            user_id=db_user.id if db_user else None,
            movie_id=db_movie.id,
            role="user",
            message=payload.question,
            persona=payload.persona
        )
        db.add(user_msg)
        db.commit()

        # stream tokens with sse
        full_answer = []
        citations = []
        async def event_generator():
            async for item in answer_question_stream(movie=payload.movie, question=payload.question, persona=payload.persona, thread_id=payload.thread_id):
                if item["type"] == "citations":
                    citations.extend(item["ids"])
                    yield f"data: {json.dumps(item)}\n\n"
                    continue
                    
                token = item["token"]
                full_answer.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"
            
            # Save assistant message to history
            assistant_msg = sql_models.ChatHistory(
                thread_id=payload.thread_id,
                user_id=db_user.id if db_user else None,
                movie_id=db_movie.id,
                role="assistant",
                message="".join(full_answer),
                citations=json.dumps(citations),
                persona=payload.persona
            )
            db.add(assistant_msg)
            db.commit()

            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Embeddings not ready yet. Try again soon.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))