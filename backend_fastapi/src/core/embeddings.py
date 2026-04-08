import os
from sentence_transformers import SentenceTransformer
from typing import TypedDict, List
import numpy as np
from src.core import vector_db

# Keep the global embedder instance
embedder = SentenceTransformer("all-MiniLM-L6-v2")

from langchain_text_splitters import RecursiveCharacterTextSplitter

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 150) -> List[str]:
    """
    Split text into overlapping chunks using LangChain's RecursiveCharacterTextSplitter.
    This is more effective for RAG as it respects document structure.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""]
    )
    return splitter.split_text(text)

def build_embeddings(movie_name: str, tmdb_id: int, text: str) -> int:
    """
    Build embeddings from text and save to ChromaDB
    
    Args:
        movie_name: Name of the movie (with year)
        tmdb_id: Unique TMDB ID
        text: Full text to create embeddings from
    
    Returns:
        Number of chunks created
    """
    # Chunk the text
    chunks = chunk_text(text, chunk_size=1000, chunk_overlap=100)
    
    if not chunks:
        return 0

    # Create embeddings
    print(f"Generating vectors for {len(chunks)} chunks in high-throughput mode...")
    vectors = embedder.encode(chunks, batch_size=256, show_progress_bar=False, convert_to_tensor=False)
    
    # Save to ChromaDB
    vector_db.add_movie_vectors(tmdb_id, movie_name, chunks, vectors)
    
    return len(chunks)
