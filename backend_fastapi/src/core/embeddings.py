import os
from sentence_transformers import SentenceTransformer
from typing import TypedDict, List
import numpy as np
from src.core import vector_db

# Keep the global embedder instance
embedder = SentenceTransformer("all-MiniLM-L6-v2")

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 100) -> List[str]:
    """
    Split text into overlapping chunks
    
    Args:
        text: Full text to chunk
        chunk_size: Size of each chunk
        chunk_overlap: Overlap between chunks
    
    Returns:
        List of text chunks
    """
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - chunk_overlap
    
    return chunks

def build_embeddings(movie_name: str, text: str) -> int:
    """
    Build embeddings from text and save to ChromaDB
    
    Args:
        movie_name: Name of the movie (with year)
        text: Full text to create embeddings from
    
    Returns:
        Number of chunks created
    """
    # Chunk the text
    chunks = chunk_text(text, chunk_size=1000, chunk_overlap=100)
    
    if not chunks:
        return 0

    # Create embeddings
    print(f"Generating vectors for {len(chunks)} chunks...")
    vectors = embedder.encode(chunks, show_progress_bar=False, convert_to_tensor=False)
    
    # Save to ChromaDB
    vector_db.add_movie_vectors(movie_name, chunks, vectors)
    
    return len(chunks)
