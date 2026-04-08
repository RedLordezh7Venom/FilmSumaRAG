from src.core.chroma_store import ChromaVectorStore
import numpy as np
from typing import List, Dict, Optional, Union

# Factory for the vector store implementation
# For now, default to ChromaDB (8GB RAM optimization)
store = ChromaVectorStore()

def add_movie_vectors(tmdb_id: Union[int, str], movie_name: str, chunks: List[str], vectors: np.ndarray) -> None:
    """Proxy to store.add_vectors"""
    store.add_vectors(tmdb_id, movie_name, chunks, vectors)

def search_movie(tmdb_id: Union[int, str], query_vector: np.ndarray, n_results: int = 3) -> List[Dict]:
    """Proxy to store.search"""
    return store.search(tmdb_id, query_vector, n_results=n_results)

def has_movie(tmdb_id: Union[int, str]) -> bool:
    """Proxy to store.has_movie"""
    return store.has_movie(tmdb_id)

def get_movie_documents(tmdb_id: Union[int, str]) -> List[str]:
    """Proxy to store.get_movie_documents for backwards compatibility"""
    return store.get_movie_documents(tmdb_id)

def get_movie_data(tmdb_id: Union[int, str]) -> List[Dict]:
    """Proxy to store.get_movie_data"""
    return store.get_movie_data(tmdb_id)

def delete_movie(tmdb_id: Union[int, str]) -> None:
    """Proxy to store.delete_movie"""
    store.delete_movie(tmdb_id)

def add_movie_summary_vector(tmdb_id: Union[int, str], movie_name: str, summary_text: str, vector: np.ndarray) -> None:
    """Proxy to store.add_movie_summary_vector"""
    store.add_movie_summary_vector(tmdb_id, movie_name, summary_text, vector)

def get_similar_movies(tmdb_id: Union[int, str], n_results: int = 5) -> List[Dict]:
    """Proxy to store.get_similar_movies"""
    return store.get_similar_movies(tmdb_id, n_results=n_results)
