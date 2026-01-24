from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from src.utils.subliminalsubsdl import download_subs_lines
from src.core.embeddings import build_embeddings
from src.core import vector_db
from src.db.database import get_db
from src.models.sql_models import Movie, JobStatus
import os

router = APIRouter()

class EmbeddingRequest(BaseModel):
    tmdb_id: str
    movie_title: str

def generate_embeddings_task(tmdb_id: str, movie_title: str, db: Session):
    """Background task to generate embeddings from subtitles"""
    # Re-fetch movie to get fresh session
    movie_record = db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
    if not movie_record:
        return # Should not happen

    try:
        print(f"Starting embeddings generation for {movie_title} (ID: {tmdb_id})...")
        movie_record.status = JobStatus.PROCESSING
        db.commit()
        
        # Download subtitles
        dialogue_lines = download_subs_lines(movie_title)
        if not dialogue_lines:
            print(f"No subtitle data found for {movie_title}")
            movie_record.status = JobStatus.FAILED
            movie_record.error_message = "No subtitles found"
            db.commit()
            return
        
        # Create full text from subtitles
        full_text = "\n".join(dialogue_lines)
        
        # Build and save embeddings using tmdb_id
        build_embeddings(tmdb_id, full_text)
        
        movie_record.status = JobStatus.COMPLETED
        db.commit()
        print(f"✅ Embeddings generation completed for {movie_title} (ID: {tmdb_id})")
        
    except Exception as e:
        print(f"❌ Error generating embeddings for {movie_title}: {str(e)}")
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
        # Check DB status by tmdb_id
        movie_record = db.query(Movie).filter(Movie.tmdb_id == request.tmdb_id).first()
        
        if movie_record:
            if movie_record.status == JobStatus.COMPLETED:
                return {"status": "ready", "message": f"Embeddings ready for {request.movie_title}"}
            elif movie_record.status == JobStatus.PROCESSING:
                return {"status": "processing", "message": f"Already processing {request.movie_title}"}
            # If failed or pending, we might retry usually, but let's assume retry for now
        else:
            # Create new record
            movie_record = Movie(tmdb_id=request.tmdb_id, title=request.movie_title, status=JobStatus.PENDING)
            db.add(movie_record)
            db.commit()

        # Add background task
        def task_wrapper(tid, mtitle):
            from src.db.database import SessionLocal
            db_task = SessionLocal()
            try:
                generate_embeddings_task(tid, mtitle, db_task)
            finally:
                db_task.close()

        background_tasks.add_task(task_wrapper, request.tmdb_id, request.movie_title)
        
        return {
            "status": "processing",
            "message": f"Embeddings generation started for {request.movie_title}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check_embeddings/{tmdb_id}")
async def check_embeddings(tmdb_id: str, db: Session = Depends(get_db)):
    """
    Check if embeddings exist for a movie using SQL DB
    """
    movie_record = db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first()
    
    status = "not_found"
    movie_title = "Unknown"
    if movie_record:
        status = movie_record.status.value
        movie_title = movie_record.title
    
    return {
        "exists": status == "completed",
        "tmdb_id": tmdb_id,
        "movie": movie_title,
        "status": status
    }


