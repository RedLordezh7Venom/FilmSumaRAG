from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from src.utils.subliminalsubsdl import download_subs_lines
from src.core.embeddings import build_embeddings
from src.core import vector_db
import os

router = APIRouter()

class EmbeddingRequest(BaseModel):
    movie: str

def generate_embeddings_task(movie_name: str):
    """Background task to generate embeddings from subtitles"""
    try:
        print(f"Starting embeddings generation for {movie_name}...")
        
        # Download subtitles
        dialogue_lines = download_subs_lines(movie_name)
        if not dialogue_lines:
            print(f"No subtitle data found for {movie_name}")
            return
        
        # Create full text from subtitles
        full_text = "\n".join(dialogue_lines)
        
        # Build and save embeddings
        build_embeddings(movie_name, full_text)
        print(f"✅ Embeddings generation completed for {movie_name}")
        
    except Exception as e:
        print(f"❌ Error generating embeddings for {movie_name}: {str(e)}")

@router.post("/generate_embeddings")
async def generate_embeddings(request: EmbeddingRequest, background_tasks: BackgroundTasks):
    """
    Endpoint to trigger embeddings generation for a movie.
    Returns immediately and processes in background.
    """
    try:
        # Check if embeddings already exist
        if vector_db.has_movie(request.movie):
            return {
                "status": "ready",
                "message": f"Embeddings already exist for {request.movie}"
            }
        
        # Add background task to generate embeddings
        background_tasks.add_task(generate_embeddings_task, request.movie)
        
        return {
            "status": "processing",
            "message": f"Embeddings generation started for {request.movie}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check_embeddings/{movie}")
async def check_embeddings(movie: str):
    """
    Check if embeddings exist for a movie
    """
    exists = vector_db.has_movie(movie)
    
    return {
        "exists": exists,
        "movie": movie,
        "status": "ready" if exists else "not_found"
    }

