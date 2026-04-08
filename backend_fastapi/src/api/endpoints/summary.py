from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
import json

from src.models.movie import MovieName
from src.core.llm_model import generate_summary_stream
from src.utils.subliminalsubsdl import download_subs_lines
from src.db.database import get_db
from src.models import sql_models
from src.api.endpoints.embeddings_generation import generate_embeddings_task

router = APIRouter()

@router.post('/summarize')
async def summarize_movie_endpoint(
    movie: MovieName, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    try:
        moviename = movie.moviename
        tmdb_id = movie.tmdb_id
        print(f"[SUMMARIZE] Received request for: {moviename} (TMDB ID: {tmdb_id})")
        
        # Check if movie exists in DB (Atomic get-or-create pattern)
        db_movie = db.query(sql_models.Movie).filter(sql_models.Movie.tmdb_id == tmdb_id).first()
        if not db_movie:
            try:
                db_movie = sql_models.Movie(
                    tmdb_id=tmdb_id, 
                    title=moviename, 
                    status=sql_models.JobStatus.PROCESSING
                )
                db.add(db_movie)
                db.commit()
                db.refresh(db_movie)
            except Exception:
                db.rollback()
                db_movie = db.query(sql_models.Movie).filter(sql_models.Movie.tmdb_id == tmdb_id).first()
                if not db_movie:
                    raise HTTPException(status_code=500, detail="Failed to initialize movie record")
        
        # Check if embeddings exist — only trigger background generation if BOTH are missing
        from src.core import vector_db
        already_indexed = (
            db_movie.status == sql_models.JobStatus.COMPLETED
            and vector_db.has_movie(tmdb_id)
        )
        if already_indexed:
            print(f"[SUMMARIZE] Cache/Vector HIT for {moviename} — skipping re-indexing.")
        else:
            print(f"[SUMMARIZE] No index found for {moviename} — scheduling background embeddings.")
            def task_wrapper(m_name, t_id):
                from src.db.database import SessionLocal
                db_task = SessionLocal()
                try:
                    generate_embeddings_task(m_name, t_id, db_task)
                finally:
                    db_task.close()
            background_tasks.add_task(task_wrapper, moviename, tmdb_id)

        # Check if summary exists in DB
        existing_summary = db.query(sql_models.SummaryCache).filter(
            sql_models.SummaryCache.movie_id == db_movie.id,
            sql_models.SummaryCache.summary_type == "general"
        ).first()
        
        if existing_summary:
            print(f"Cache hit for {moviename}")
            return JSONResponse(content={"token": existing_summary.content, "cached": True})

        # get subtitle text
        dialogue_lines = download_subs_lines(moviename)
        if not dialogue_lines:
            raise HTTPException(status_code=404, detail="No subtitles found")
        
        full_text = "\n".join(dialogue_lines)
        
        # stream summary tokens
        full_summary = []
        async def event_generator():
            async for token in generate_summary_stream(full_text):
                full_summary.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"
            
            # Save summary to DB at the end
            complete_summary = "".join(full_summary)
            new_summary = sql_models.SummaryCache(
                movie_id=db_movie.id,
                summary_type="general",
                content=complete_summary
            )
            db.add(new_summary)
            # Update status to COMPLETED after embeddings are likely ready or being worked on
            # We rely on the embeddings background task to finalize the status if needed, 
            # but summarization also counts as a step.
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
        print(f"File not found: {e}")
        if 'db_movie' in locals():
            db_movie.error_message = f"File not found: {e.filename}"
            db_movie.status = sql_models.JobStatus.FAILED
            db.commit()
        raise HTTPException(status_code=404, detail=f"File not found: {e.filename}")
    except Exception as e:
        print(f"Error: {e}")
        if 'db_movie' in locals():
            db_movie.error_message = str(e)
            db_movie.status = sql_models.JobStatus.FAILED
            db.commit()
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/video_essays')
async def discovery_essays_endpoint(movie: MovieName, db: Session = Depends(get_db)):
    try:
        from src.agents.video_crawler import VideoEssayAgent
        crawler = VideoEssayAgent()
        essays = await crawler.find_video_essays(movie.moviename)
        return {"movie": movie.moviename, "essays": essays}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))