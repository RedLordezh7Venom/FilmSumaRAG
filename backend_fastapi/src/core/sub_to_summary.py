from src.utils.subliminalsubsdl import download_subs_lines
from src.core.llm_model import generate_summary
from src.core.embeddings import build_embeddings
import asyncio, threading
import os

async def get_movie_summary(moviename: str):
    print("Downloading subtitles...")
    dialogue_lines = download_subs_lines(moviename)
    if not dialogue_lines:
        print("No subtitle data found.")
        return None

    print("Processing subtitles...")
    full_text = "\n".join(dialogue_lines)
    print("Generating advanced summary...")
    from src.agents.summarizer import MovieSummarizer
    summary = await MovieSummarizer.summarize_transcript(full_text, moviename)

    # Save summary
    os.makedirs("data/summaries", exist_ok=True)
    with open(f"data/summaries/{moviename}.txt", "w", encoding="utf-8") as f:
        f.write(summary)

    # Background embedding generation for the full transcript
    threading.Thread(target=build_embeddings, args=(moviename, full_text)).start()
    print(f"🔄 Started background embedding creation for {moviename}")

    return summary
