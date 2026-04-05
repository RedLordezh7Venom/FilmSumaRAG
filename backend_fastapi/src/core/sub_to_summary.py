from src.utils.subliminalsubsdl import download_subs_lines
from src.core.llm_model import generate_summary
from src.core.embeddings import build_embeddings
import asyncio, threading
import os

async def get_movie_summary(moviename: str):
    print(f"🎬 Starting ingestion for: {moviename}")
    print("Downloading subtitles...")
    dialogue_lines = download_subs_lines(moviename)
    if not dialogue_lines:
        print("No subtitle data found.")
        return None

    full_text = "\n".join(dialogue_lines)
    print("Generating advanced summary...")
    from src.agents.summarizer import MovieSummarizer
    summary = await MovieSummarizer.summarize_transcript(full_text, moviename)

    # 1. Save summary file (legacy/local)
    os.makedirs("data/summaries", exist_ok=True)
    with open(f"data/summaries/{moviename}.txt", "w", encoding="utf-8") as f:
        f.write(summary)

    # 2. Trigger Background Tasks:
    # - Embeddings generation
    # - Research Agent discovery (Video Essays)
    def background_research_and_embed(movie: str, transcript: str):
        # Embeddings: Full Dialogue Chunks
        build_embeddings(movie, transcript)
        
        # Embeddings: Full Movie Summary (for Recommendations)
        # Import embedder from embeddings.py
        from src.core.embeddings import embedder
        import src.core.vector_db as vector_db
        summary_vec = embedder.encode([summary], convert_to_tensor=False)[0]
        vector_db.add_movie_summary_vector(movie, summary, summary_vec)
        
        # Research Discovery
        from src.agents.research_agent import ResearchAgent
        from src.db.database import SessionLocal
        from src.models.sql_models import SummaryCache, SummaryType, Movie
        
        print(f"📡 ResearchAgent: Finding external analysis for {movie}...")
        findings = ResearchAgent.search_video_essays(movie)
        research_summary = ResearchAgent.generate_research_summary(movie, findings)
        
        db = SessionLocal()
        try:
            movie_record = db.query(Movie).filter(Movie.title == movie).first()
            if movie_record:
                # Store the external research findings in SummaryCache
                # Update if already exists or create new
                existing = db.query(SummaryCache).filter(
                    SummaryCache.movie_id == movie_record.id,
                    SummaryCache.summary_type == SummaryType.VIDEO_ESSAY
                ).first()
                
                if existing:
                    existing.content = research_summary
                else:
                    new_cache = SummaryCache(
                        movie_id=movie_record.id,
                        summary_type=SummaryType.VIDEO_ESSAY,
                        content=research_summary
                    )
                    db.add(new_cache)
                db.commit()
                print(f"✅ ResearchAgent: Saved external findings for {movie}")
        finally:
            db.close()

    threading.Thread(target=background_research_and_embed, args=(moviename, full_text)).start()
    print(f"🔄 Started background research & embedding for {moviename}")

    return summary
