import os
import pickle
from sentence_transformers import SentenceTransformer
from typing import TypedDict, List
import numpy as np

embedder = SentenceTransformer("all-MiniLM-L6-v2")

class EmbeddingState(TypedDict):
    """State for embedding workflow"""
    movie_name: str
    text: str
    chunks: List[str]
    vectors: np.ndarray
    chunk_count: int
    filepath: str

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
    Build embeddings from text and save to disk
    
    Args:
        movie_name: Name of the movie (with year)
        text: Full text to create embeddings from
    
    Returns:
        Number of chunks created
    """
    # Chunk the text
    chunks = chunk_text(text, chunk_size=1000, chunk_overlap=100)
    
    # Create embeddings
    vectors = embedder.encode(chunks, convert_to_tensor=False)
    
    # Prepare data
    data = {"chunks": chunks, "vectors": vectors}

    # Ensure directory exists
    os.makedirs("data/embeddings", exist_ok=True)
    
    # Save embeddings
    filepath = f"data/embeddings/{movie_name}.pkl"
    with open(filepath, "wb") as f:
        pickle.dump(data, f)
    
    print(f"✅ Embeddings saved for {movie_name} ({len(chunks)} chunks)")
    return len(chunks)

def load_embeddings(movie_name: str) -> dict:
    """
    Load embeddings from disk
    
    Args:
        movie_name: Name of the movie (with year)
        
    Returns:
        dict: Dictionary containing 'chunks' and 'vectors'
        
    Raises:
        FileNotFoundError: If embeddings don't exist for this movie
    """
    path = f"data/embeddings/{movie_name}.pkl"
    if not os.path.exists(path):
        raise FileNotFoundError(f"Embeddings not found for {movie_name}")
    
    with open(path, "rb") as f:
        data = pickle.load(f)
    
    print(f"✅ Embeddings loaded for {movie_name} ({len(data['chunks'])} chunks)")
    return data