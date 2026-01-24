from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from src.models.movie import MovieName
from src.core.llm_model import generate_summary_stream
from src.utils.subliminalsubsdl import download_subs_lines
import json

router = APIRouter()

@router.post('/summarize')
async def summarize_movie_endpoint(movie: MovieName):
    try:
        movie_title = movie.movie_title
        tmdb_id = movie.tmdb_id
        print(f"Processing movie: {movie_title} (ID: {tmdb_id})")
        
        # get subtitle text
        dialogue_lines = download_subs_lines(movie_title)
        if not dialogue_lines:
            raise HTTPException(status_code=404, detail="No subtitles found")
        
        full_text = "\n".join(dialogue_lines)
        
        # stream summary tokens
        async def event_generator():
            async for token in generate_summary_stream(full_text):
                yield f"data: {json.dumps({'token': token})}\n\n"
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
        raise HTTPException(status_code=404, detail=f"File not found: {e.filename}")
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))