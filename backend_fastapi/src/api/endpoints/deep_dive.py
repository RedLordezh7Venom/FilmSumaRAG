from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
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
    tmdb_ids: Optional[List[int]] = None # New optional field for direct ID passing

@router.post("/deep_dive")
async def deep_dive_chat(
    payload: ChatQuery, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    from src.utils.logger import logger
    try:
        movie_titles = [payload.movie] if isinstance(payload.movie, str) else payload.movie
        resolved_tmdb_ids = []
        first_movie_db_id = None

        logger.log("INPUT", f"Question: {payload.question[:50]}...")
        
        # Resolve or create movie records
        for i, title in enumerate(movie_titles):
            passed_id = payload.tmdb_ids[i] if payload.tmdb_ids and i < len(payload.tmdb_ids) else None
            
            db_movie = None
            if passed_id:
                db_movie = db.query(sql_models.Movie).filter(sql_models.Movie.tmdb_id == passed_id).first()
            
            if not db_movie:
                db_movie = db.query(sql_models.Movie).filter(sql_models.Movie.title == title).first()

            if not db_movie:
                if not passed_id:
                     logger.error(f"Movie resolve failed for '{title}' (No ID)")
                     raise HTTPException(status_code=400, detail=f"No ID for {title}")
                
                logger.db(f"Auto-initializing record for {title}")
                db_movie = sql_models.Movie(title=title, tmdb_id=passed_id, status=sql_models.JobStatus.PROCESSING)
                db.add(db_movie)
                db.commit()
                db.refresh(db_movie)

            # Trigger embeddings if needed
            from src.core import vector_db
            current_tid = db_movie.tmdb_id
            if not vector_db.has_movie(current_tid):
                logger.worker(f"Triggering background workers for {title}...")
                def task_wrapper(m_name, t_id):
                    from src.db.database import SessionLocal
                    from src.utils.logger import logger
                    db_task = SessionLocal()
                    try:
                        from src.api.endpoints.summary import generate_embeddings_task
                        generate_embeddings_task(m_name, t_id, db_task)
                    finally:
                        db_task.close()
                background_tasks.add_task(task_wrapper, title, current_tid)

            resolved_tmdb_ids.append(current_tid)
            if first_movie_db_id is None: first_movie_db_id = db_movie.id

        # 2. Resolve User & Migration
        db_user = None
        if payload.clerk_id:
            db_user = db.query(sql_models.User).filter(sql_models.User.clerk_id == payload.clerk_id).first()
            if db_user:
                logger.db(f"Claiming guest thread {payload.thread_id} for user {db_user.id}")
                db.query(sql_models.ChatHistory).filter(
                    sql_models.ChatHistory.thread_id == payload.thread_id,
                    sql_models.ChatHistory.user_id == None
                ).update({"user_id": db_user.id})
                db.commit()

        # 3. Save User Message
        user_msg = sql_models.ChatHistory(
            thread_id=payload.thread_id,
            user_id=db_user.id if db_user else None,
            movie_id=first_movie_db_id,
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
                tmdb_id=resolved_tmdb_ids,
                question=payload.question,
                persona=payload.persona,
                thread_id=payload.thread_id
            ):
                if item["type"] == "status":
                    status_json = json.dumps({'token': f"💡 _{item['message']}_ \n\n"})
                    yield f"data: {status_json}\n\n"
                    continue
                if item["type"] == "citations":
                    citations = item["sources"]
                    yield f"data: {json.dumps(item)}\n\n"
                    continue
                if item["type"] == "token":
                    token = item["token"]
                    full_answer += token
                    yield f"data: {json.dumps({'token': token})}\n\n"
                if item["type"] == "done":
                    break

            # Finalize: Save to DB
            assistant_msg = sql_models.ChatHistory(
                thread_id=payload.thread_id,
                user_id=db_user.id if db_user else None,
                movie_id=first_movie_db_id,
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
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )

    except Exception as e:
        logger.error(f"Deep Dive Fatal: {e}")
        raise HTTPException(status_code=500, detail=str(e))