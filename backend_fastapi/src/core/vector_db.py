from src.core.chroma_store import ChromaVectorStore
import numpy as np
from typing import List, Dict, Optional

# Factory for the vector store implementation
# For now, default to ChromaDB (8GB RAM optimization)
# Scalable: In production, swap this with PineconeStore or SupabaseStore
store = ChromaVectorStore()

def add_movie_vectors(movie_name: str, chunks: List[str], vectors: np.ndarray) -> None:
    """Proxy to store.add_vectors"""
    store.add_vectors(movie_name, chunks, vectors)

def search_movie(movie_name: str, query_vector: np.ndarray, n_results: int = 3) -> List[Dict]:
    """Proxy to store.search"""
    return store.search(movie_name, query_vector, n_results=n_results)

def has_movie(movie_name: str) -> bool:
    """Proxy to store.has_movie"""
    return store.has_movie(movie_name)

def get_movie_documents(movie_name: str) -> List[str]:
    """Proxy to store.get_movie_documents for backwards compatibility"""
    return store.get_movie_documents(movie_name)

def get_movie_data(movie_name: str) -> List[Dict]:
    """Proxy to store.get_movie_data"""
    return store.get_movie_data(movie_name)

def delete_movie(movie_name: str) -> None:
    """Proxy to store.delete_movie"""
    store.delete_movie(movie_name)
