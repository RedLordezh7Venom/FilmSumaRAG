from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
import json

from src.models.movie import MovieName
from src.core.llm_model import generate_summary_stream
from src.utils.subliminalsubsdl import download_subs_lines
from src.db.database import get_db
from src.models import sql_models

router = APIRouter()

@router.post('/summarize')
async def summarize_movie_endpoint(movie: MovieName, db: Session = Depends(get_db)):
    try:
        moviename = movie.moviename
        print(f"Processing movie: {moviename}")
        
        # Check if movie exists in DB
        db_movie = db.query(sql_models.Movie).filter(sql_models.Movie.title == moviename).first()
        if not db_movie:
            db_movie = sql_models.Movie(title=moviename, status=sql_models.JobStatus.PROCESSING)
            db.add(db_movie)
            db.commit()
            db.refresh(db_movie)
        
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
            db_movie.status = sql_models.JobStatus.COMPLETED
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