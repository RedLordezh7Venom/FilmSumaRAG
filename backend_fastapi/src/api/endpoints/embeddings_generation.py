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
    movie: str

def generate_embeddings_task(movie_name: str, db: Session):
    """Background task to generate embeddings from subtitles"""
    # Re-fetch movie to get fresh session
    movie_record = db.query(Movie).filter(Movie.title == movie_name).first()
    if not movie_record:
        return # Should not happen

    try:
        print(f"Starting embeddings generation for {movie_name}...")
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
        
        # Build and save embeddings
        build_embeddings(movie_name, full_text)
        
        movie_record.status = JobStatus.COMPLETED
        db.commit()
        print(f"✅ Embeddings generation completed for {movie_name}")
        
    except Exception as e:
        print(f"❌ Error generating embeddings for {movie_name}: {str(e)}")
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
        movie_record = db.query(Movie).filter(Movie.title == request.movie).first()
        
        if movie_record:
            if movie_record.status == JobStatus.COMPLETED:
                return {"status": "ready", "message": f"Embeddings ready for {request.movie}"}
            elif movie_record.status == JobStatus.PROCESSING:
                return {"status": "processing", "message": f"Already processing {request.movie}"}
            # If failed or pending, we might retry usually, but let's assume retry for now
        else:
            # Create new record
            movie_record = Movie(title=request.movie, status=JobStatus.PENDING)
            db.add(movie_record)
            db.commit()

        # Add background task
        # Note: We can't pass the request-scoped 'db' session to the background task reliably 
        # because it closes after response. We need to create a new session or be careful.
        # Simple hack for this local setup: Pass the ID and let task open a new session?
        # Better: create a new session inside the task wrapper.
        
        # We'll use a wrapper to handle the DB session for the background task
        def task_wrapper(m_name):
            from src.db.database import SessionLocal
            db_task = SessionLocal()
            try:
                generate_embeddings_task(m_name, db_task)
            finally:
                db_task.close()

        background_tasks.add_task(task_wrapper, request.movie)
        
        return {
            "status": "processing",
            "message": f"Embeddings generation started for {request.movie}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check_embeddings/{movie}")
async def check_embeddings(movie: str, db: Session = Depends(get_db)):
    """
    Check if embeddings exist for a movie using SQL DB
    """
    movie_record = db.query(Movie).filter(Movie.title == movie).first()
    
    status = "not_found"
    if movie_record:
        status = movie_record.status.value
    
    return {
        "exists": status == "completed",
        "movie": movie,
        "status": status
    }


