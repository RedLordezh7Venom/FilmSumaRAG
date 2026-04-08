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
    from src.utils.logger import logger
    try:
        moviename = movie.moviename
        tmdb_id = movie.tmdb_id
        logger.worker(f"Summarize request for {moviename} (ID:{tmdb_id})")
        
        # 1. Resolve movie (Intelligent Get-or-Merge)
        logger.db(f"Resolving identity for '{moviename}'...")
        db_movie = db.query(sql_models.Movie).filter(sql_models.Movie.tmdb_id == tmdb_id).first()
        if not db_movie:
            db_movie = db.query(sql_models.Movie).filter(sql_models.Movie.title == moviename).first()
            if db_movie:
                logger.db(f"Merging legacy title '{moviename}' to TMDB ID: {tmdb_id}")
                db_movie.tmdb_id = tmdb_id
                db.commit()
            else:
                try:
                    logger.db(f"Creating fresh archive record for '{moviename}'")
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
                    db_movie = db.query(sql_models.Movie).filter(
                        (sql_models.Movie.tmdb_id == tmdb_id) | (sql_models.Movie.title == moviename)
                    ).first()
                    if not db_movie:
                        raise HTTPException(status_code=500, detail="Failed to initialize movie record")
        
        # Check if embeddings exist
        from src.core import vector_db
        already_indexed = (
            db_movie.status == sql_models.JobStatus.COMPLETED
            and vector_db.has_movie(tmdb_id)
        )
        if already_indexed:
            logger.rag(f"Vector HIT for {moviename} — skipping re-indexing.")
        else:
            logger.worker(f"Scheduling background embeddings for {moviename}...")
            def task_wrapper(m_name, t_id):
                from src.db.database import SessionLocal
                from src.utils.logger import logger
                db_task = SessionLocal()
                try:
                    logger.worker(f"Starting embedding task for {m_name}")
                    generate_embeddings_task(m_name, t_id, db_task)
                    logger.worker(f"Finished embedding task for {m_name}")
                finally:
                    db_task.close()
            background_tasks.add_task(task_wrapper, moviename, tmdb_id)

        # Check if summary exists in DB
        existing_summary = db.query(sql_models.SummaryCache).filter(
            sql_models.SummaryCache.movie_id == db_movie.id,
            sql_models.SummaryCache.summary_type == "general"
        ).first()
        
        if existing_summary:
            logger.db(f"Cache HIT for {moviename} summary.")
            return JSONResponse(content={"token": existing_summary.content, "cached": True})

        # get subtitle text
        logger.fetch(f"Downloading transcript for {moviename}...")
        dialogue_lines = download_subs_lines(moviename)
        if not dialogue_lines:
            logger.error(f"No subtitles found for {moviename}")
            raise HTTPException(status_code=404, detail="No subtitles found")
        
        full_text = "\n".join(dialogue_lines)
        
        # 4. Stream response using SSE
        async def event_generator():
            from src.db.database import SessionLocal
            from src.utils.logger import logger
            gen_db = SessionLocal()
            full_summary = []
            
            try:
                logger.agent(f"Starting summary stream for {moviename}...")
                async for token in generate_summary_stream(full_text):
                    full_summary.append(token)
                    yield f"data: {json.dumps({'token': token})}\n\n"
                
                complete_summary = "".join(full_summary)
                inner_movie = gen_db.query(sql_models.Movie).filter(sql_models.Movie.tmdb_id == tmdb_id).first()
                if not inner_movie:
                    inner_movie = sql_models.Movie(tmdb_id=tmdb_id, title=moviename)
                    gen_db.add(inner_movie)
                    gen_db.commit()
                    gen_db.refresh(inner_movie)

                new_summary = sql_models.SummaryCache(
                    movie_id=inner_movie.id,
                    summary_type="general",
                    content=complete_summary
                )
                gen_db.add(new_summary)
                
                # Recommendation Indexing
                try:
                    from src.core.embeddings import embedder
                    from src.core import vector_db
                    logger.rag(f"Updating recommendation index for {moviename}...")
                    summary_vec = embedder.encode(complete_summary)
                    vector_db.add_movie_summary_vector(tmdb_id, moviename, complete_summary, summary_vec)
                except Exception as e:
                    logger.error(f"Recommendation indexing failed: {e}")

                # External Research
                try:
                    from src.agents.video_crawler import VideoEssayAgent
                    from src.agents.research_agent import ResearchAgent
                    logger.agent(f"Crawling external research for {moviename}...")
                    crawler = VideoEssayAgent()
                    essays = await crawler.find_video_essays(moviename)
                    research_summary_text = ResearchAgent.generate_research_summary(moviename, essays)
                    
                    research_cache = sql_models.SummaryCache(
                        movie_id=inner_movie.id, 
                        summary_type="video_essay",
                        content=research_summary_text
                    )
                    gen_db.add(research_cache)
                    logger.agent(f"Research synthesis complete for {moviename}")
                except Exception as e:
                    logger.error(f"Research agent failed: {e}")

                inner_movie.status = sql_models.JobStatus.COMPLETED
                gen_db.commit()
                yield "data: [DONE]\n\n"

            except Exception as e:
                gen_db.rollback()
                logger.error(f"Stream crash: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            finally:
                gen_db.close()
        
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