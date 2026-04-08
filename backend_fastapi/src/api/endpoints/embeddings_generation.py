from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from src.utils.subliminalsubsdl import download_subs_lines
from src.core.embeddings import build_embeddings
from src.core import vector_db
from src.db.database import get_db
from src.models.sql_models import Movie, JobStatus
from typing import Optional, Union
import os

router = APIRouter()

class EmbeddingRequest(BaseModel):
    movie: str
    tmdb_id: int

def generate_embeddings_task(movie_name: str, tmdb_id: int, db: Session):
    """Background task to generate embeddings from subtitles"""
    # Re-fetch movie to get fresh session
    movie_record = db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
    if not movie_record:
        return # Should not happen

    try:
        print(f"Starting embeddings generation for {movie_name} (ID: {tmdb_id})...")
        movie_record.status = JobStatus.PROCESSING
        db.commit()
        
        # Download subtitles
        dialogue_lines = download_subs_lines(movie_name)
        if not dialogue_lines:
            print(f"No subtitle data found for {movie_name}")
            movie_record.status = JobStatus.FAILED
            movie_record.error_message = "No subtitles found"
            db.commit()
            return
        
        # Create full text from subtitles
        full_text = "\n".join(dialogue_lines)
        
        # Build and save embeddings (passing tmdb_id)
        count = build_embeddings(movie_name, tmdb_id, full_text)
        
        if count == 0:
            movie_record.status = JobStatus.FAILED
            movie_record.error_message = "Subtitles found but no indexable content (instrumental film?)"
        else:
            movie_record.status = JobStatus.COMPLETED
            
        db.commit()
        print(f"✅ Embeddings generation completed for {movie_name} (Chunks: {count})")
        
    except Exception as e:
        print(f"❌ Error generating embeddings for {movie_name}: {str(e)}")
        if 'movie_record' in locals():
            movie_record.status = JobStatus.FAILED
            movie_record.error_message = str(e)
            db.commit()

@router.post("/generate_embeddings")
async def generate_embeddings(
    request: EmbeddingRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Endpoint to trigger embeddings generation for a movie.
    Returns immediately and processes in background.
    """
    try:
        # Check DB status
        movie_record = db.query(Movie).filter(Movie.tmdb_id == request.tmdb_id).first()
        
        if movie_record:
            if movie_record.status == JobStatus.COMPLETED:
                if vector_db.has_movie(request.tmdb_id):
                    return {"status": "ready", "message": f"Embeddings ready for {request.movie}"}
                else:
                    # Database desync (SQL says COMPLETED, but VectorDB is missing it). Force regeneration.
                    movie_record.status = JobStatus.PENDING
                    db.commit()
            elif movie_record.status == JobStatus.PROCESSING:
                return {"status": "processing", "message": f"Already processing {request.movie}"}
        else:
            # Create new record
            movie_record = Movie(tmdb_id=request.tmdb_id, title=request.movie, status=JobStatus.PENDING)
            db.add(movie_record)
            db.commit()

        # Add background task
        def task_wrapper(m_name, t_id):
            from src.db.database import SessionLocal
            db_task = SessionLocal()
            try:
                generate_embeddings_task(m_name, t_id, db_task)
            finally:
                db_task.close()

        background_tasks.add_task(task_wrapper, request.movie, request.tmdb_id)
        
        return {
            "status": "processing",
            "message": f"Embeddings generation started for {request.movie}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check_embeddings/{tmdb_id}")
async def check_embeddings(tmdb_id: int, db: Session = Depends(get_db)):
    """
    Check if embeddings exist for a movie using SQL DB
    """
    movie_record = db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
    
    status = "not_found"
    if movie_record:
        status = movie_record.status.value
    
    return {
        "exists": status == "completed",
        "tmdb_id": tmdb_id,
        "status": status
    }
