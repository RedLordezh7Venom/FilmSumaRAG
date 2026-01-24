import chromadb
import numpy as np
from typing import List, Optional
import os

# Initialize persistent client
# This creates a directory 'chroma_db' in the project root
CHROMA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_db")
client = chromadb.PersistentClient(path=CHROMA_PATH)

# Create or get collection
collection = client.get_or_create_collection(name="movie_dialogues")

def add_movie_vectors(movie_name: str, chunks: List[str], vectors: np.ndarray) -> None:
    """
    Add movie vectors to ChromaDB.
    We associate each chunk with the movie_name via metadata.
    """
    count = len(chunks)
    
    # Generate unique IDs for each chunk
    ids = [f"{movie_name}_{i}" for i in range(count)]
    
    # Prepare metadata
    metadatas = [{"movie_name": movie_name, "chunk_index": i} for i in range(count)]
    
    # Convert numpy vectors to list of lists (required by Chroma)
    embeddings = vectors.tolist()
    
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas
    )
    print(f"✅ Upserted {count} chunks for {movie_name} to ChromaDB")

def search_movie(movie_name: str, query_vector: np.ndarray, n_results: int = 3) -> List[str]:
    """
    Search for similar chunks within a specific movie.
    """
    results = collection.query(
        query_embeddings=[query_vector.tolist()],
        n_results=n_results,
        where={"movie_name": {"$eq": movie_name}}  # Filter by movie
    )
    
    # results['documents'] is a list of list of strings (since we can query multiple vectors)
    if results['documents'] and len(results['documents']) > 0:
        return results['documents'][0]
    return []

def has_movie(movie_name: str) -> bool:
    """
    Check if a movie exists in the database.
    We do a lightweight query for 1 item with this metadata.
    """
    result = collection.get(
        where={"movie_name": {"$eq": movie_name}},
        limit=1
    )
    return len(result['ids']) > 0

def get_movie_documents(movie_name: str) -> List[str]:
    """
    Retrieve all document chunks for a specific movie.
    """
    results = collection.get(
        where={"movie_name": {"$eq": movie_name}}
    )
    return results['documents']

def delete_movie(movie_name: str) -> None:
    """Deleted a movie from the db"""
    collection.delete(
        where={"movie_name": {"$eq": movie_name}}
    )
