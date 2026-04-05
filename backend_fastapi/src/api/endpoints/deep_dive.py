from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from src.core.rag_chat import answer_question_stream
from src.db.database import get_db
from src.models import sql_models
from sqlalchemy.orm import Session
import json
from typing import Optional, List, Union

router = APIRouter()

class ChatQuery(BaseModel):
    movie: Union[str, List[str]]
    question: str
    thread_id: str
    persona: str = "critic"
    clerk_id: Optional[str] = None

@router.post("/deep_dive")
async def deep_dive_chat(payload: ChatQuery, db: Session = Depends(get_db)):
    try:
        # 1. Resolve movies (ensure they exist in postgres)
        movie_titles = [payload.movie] if isinstance(payload.movie, str) else payload.movie
        movie_ids = []
        for title in movie_titles:
            db_movie = db.query(sql_models.Movie).filter(sql_models.Movie.title == title).first()
            if not db_movie:
                # auto-create as pending if not found (though usually research agent handles this)
                db_movie = sql_models.Movie(title=title, status=sql_models.JobStatus.PENDING)
                db.add(db_movie)
                db.commit()
                db.refresh(db_movie)
            movie_ids.append(db_movie.id)
        
        # 2. Resolve User
        db_user = None
        if payload.clerk_id:
            db_user = db.query(sql_models.User).filter(sql_models.User.clerk_id == payload.clerk_id).first()
        
        # 3. Save User Message
        user_msg = sql_models.ChatHistory(
            thread_id=payload.thread_id,
            user_id=db_user.id if db_user else None,
            movie_id=movie_ids[0], # For simplicity, link to the first movie in the list
            role="user",
            message=payload.question,
            persona=payload.persona
        )
        db.add(user_msg)
        db.commit()

        # 4. Stream response using SSE
        async def event_generator():
            full_answer = ""
            citations = []
            
            async for item in answer_question_stream(
                movie_name=payload.movie, 
                question=payload.question, 
                persona=payload.persona, 
                thread_id=payload.thread_id
            ):
                if item["type"] == "citations":
                    citations = item["ids"]
                    yield f"data: {json.dumps(item)}\n\n"
                    continue
                
                token = item["token"]
                full_answer += token
                yield f"data: {json.dumps({'token': token})}\n\n"
            
            # Finalize: Save to DB
            assistant_msg = sql_models.ChatHistory(
                thread_id=payload.thread_id,
                user_id=db_user.id if db_user else None,
                movie_id=movie_ids[0],
                role="assistant",
                message=full_answer,
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

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparative Deep Dive Error: {str(e)}")