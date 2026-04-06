import asyncio
import os
import sys
import json
import threading
from typing import List

# Import our logic (add src to sys.path)
sys.path.append(os.path.join(os.getcwd(), "src"))

from src.core.sub_to_summary import get_movie_summary
from src.core.rag_chat import answer_question_stream
from src.db.database import SessionLocal, Base, engine
from src.models import sql_models, schemas

# Mock Subtitle Downloader
import src.utils.subliminalsubsdl as sub_utils

def mock_download_subs_lines(moviename: str) -> List[str]:
    if "Matrix" in moviename:
        return [
            "Neo: What is the Matrix?",
            "Morpheus: The Matrix is everywhere. It is all around us.",
            "Neo: I know kung fu.",
            "Agent Smith: Human beings are a disease, a cancer of this planet."
        ]
    elif "Inception" in moviename:
        return [
            "Cobb: Dreams feel real while we're in them. It's only when we wake up that we realize something was actually strange.",
            "Mal: You're waiting for a train. A train that will take you far away.",
            "Arthur: You mustn't be afraid to dream a little bigger, darling."
        ]
    return ["Hello world", "This is a test"]

# Patch the downloader
sub_utils.download_subs_lines = mock_download_subs_lines

async def run_full_test():
    print("STARTING FULL BACKEND INTEGRATION TEST")
    
    # 1. Initialize Database
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Clean up old tests
    db.query(sql_models.Movie).delete()
    db.query(sql_models.ChatHistory).delete()
    db.query(sql_models.Feedback).delete()
    db.commit()
    
    # 2. Ingest Movies
    print("\nIngesting The Matrix...")
    await get_movie_summary("The Matrix")
    
    print("\nIngesting Inception...")
    await get_movie_summary("Inception")
    
    # Wait for background tasks (Embeddings & Research)
    print("Waiting for background tasks to finish (embeddings & research)...")
    await asyncio.sleep(10) 
    
    # 3. Test Deep Dive (Single Movie)
    print("\nTesting Deep Dive: The Matrix")
    async for item in answer_question_stream("The Matrix", "What did Morpheus say about the Matrix?", persona="philosopher"):
        if item["type"] == "token":
            print(item["token"], end="", flush=True)
        elif item["type"] == "citations":
            print(f"\n[Citations: {item['ids']}]")
            
    # 4. Test Comparative Deep Dive (Matrix vs Inception)
    print("\n\nTesting Comparative Deep Dive: Matrix vs Inception")
    async for item in answer_question_stream(["The Matrix", "Inception"], "Compare the nature of reality in both films.", persona="philosopher"):
        if item["type"] == "token":
            print(item["token"], end="", flush=True)
        elif item["type"] == "citations":
            print(f"\n[Citations: {item['ids']}]")

    print("\n\nFULL TEST COMPLETE!")

if __name__ == "__main__":
    asyncio.run(run_full_test())
