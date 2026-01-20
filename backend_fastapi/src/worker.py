from src.core.celery_app import celery_app
from src.utils.subliminalsubsdl import download_subs_lines
from src.core.embeddings import build_embeddings
import logging

logger = logging.getLogger(__name__)

@celery_app.task(name="src.worker.generate_embeddings_task")
def generate_embeddings_task(movie_name: str):
    """
    Background task to generate embeddings from subtitles.
    Used in production to offload heavy work from the API.
    """
    try:
        logger.info(f"Worker starting generation for {movie_name}...")
        
        # Download subtitles
        dialogue_lines = download_subs_lines(movie_name)
        if not dialogue_lines:
            logger.error(f"No subtitles found for {movie_name}")
            return False
        
        full_text = "\n".join(dialogue_lines)
        
        # Build embeddings (In production, this would call build_embeddings which saves to ChromaDB)
        build_embeddings(movie_name, full_text)
        
        logger.info(f"✅ Worker completed embeddings for {movie_name}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Worker error for {movie_name}: {str(e)}")
        return False
