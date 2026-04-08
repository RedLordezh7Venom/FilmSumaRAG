import chromadb
import numpy as np
import os
from typing import List, Dict, Optional, Union
from src.core.vector_store_base import BaseVectorStore

class ChromaVectorStore(BaseVectorStore):
    def __init__(self, collection_name: str = "movie_dialogues"):
        # Initialize persistent client
        self.chroma_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_db")
        self.client = chromadb.PersistentClient(path=self.chroma_path)
        self.collection = self.client.get_or_create_collection(name=collection_name)
        
        # New collection for full movie summaries (for recommendations)
        self.summary_collection = self.client.get_or_create_collection(name="movie_summaries")

    def add_vectors(self, tmdb_id: Union[int, str], movie_name: str, chunks: List[str], vectors: np.ndarray) -> None:
        count = len(chunks)
        ids = [f"{tmdb_id}_{i}" for i in range(count)]
        metadatas = [{"movie_name": movie_name, "tmdb_id": int(tmdb_id), "chunk_index": i} for i in range(count)]
        
        self.collection.upsert(
            ids=ids,
            embeddings=vectors.tolist(),
            documents=chunks,
            metadatas=metadatas
        )
        print(f"[STORE] ChromaStore: Upserted {count} chunks for {movie_name} (ID: {tmdb_id})")
        
    def add_movie_summary_vector(self, tmdb_id: Union[int, str], movie_name: str, summary_text: str, vector: np.ndarray) -> None:
        """Stores the full-movie summary for similarity cross-referencing."""
        self.summary_collection.upsert(
            ids=[str(tmdb_id)],
            embeddings=[vector.tolist()],
            documents=[summary_text],
            metadatas=[{"movie_name": movie_name, "tmdb_id": int(tmdb_id)}]
        )
        print(f"[STORE] ChromaStore: Saved summary vector for {movie_name} (ID: {tmdb_id})")

    def get_similar_movies(self, tmdb_id: Union[int, str], n_results: int = 5) -> List[Dict]:
        """Finds movies similar to the given one using semantic summary distance."""
        # Get target vector
        target = self.summary_collection.get(ids=[str(tmdb_id)], include=['embeddings', 'metadatas'])
        if not target['embeddings']: return []
        
        results = self.summary_collection.query(
            query_embeddings=target['embeddings'],
            n_results=n_results + 1, # +1 to exclude itself
        )
        
        # Filter out the source movie and format
        matches = []
        for id, dist, meta in zip(results['ids'][0], results['distances'][0], results['metadatas'][0]):
            if id != str(tmdb_id):
                matches.append({
                    "tmdb_id": int(id),
                    "movie_name": meta.get("movie_name", "Unknown"),
                    "distance": dist
                })
        
        return matches

    def search(self, tmdb_id: Union[int, str], query_vector: np.ndarray, n_results: int = 3) -> List[Dict]:
        results = self.collection.query(
            query_embeddings=[query_vector.tolist()],
            n_results=n_results,
            where={"tmdb_id": {"$eq": int(tmdb_id)}}
        )
        
        if results['documents'] and len(results['documents']) > 0:
            return [{"id": id, "text": doc} for id, doc in zip(results['ids'][0], results['documents'][0])]
        return []

    def has_movie(self, tmdb_id: Union[int, str]) -> bool:
        result = self.collection.get(
            where={"tmdb_id": {"$eq": int(tmdb_id)}},
            limit=1
        )
        return len(result['ids']) > 0

    def get_movie_data(self, tmdb_id: Union[int, str]) -> List[Dict]:
        results = self.collection.get(
            where={"tmdb_id": {"$eq": int(tmdb_id)}}
        )
        return [{"id": id, "text": doc} for id, doc in zip(results['ids'], results['documents'])]

    def get_movie_documents(self, tmdb_id: Union[int, str]) -> List[str]:
        # Backwards compatibility helper
        data = self.get_movie_data(tmdb_id)
        return [d["text"] for d in data]

    def delete_movie(self, tmdb_id: Union[int, str]) -> None:
        self.collection.delete(
            where={"tmdb_id": {"$eq": int(tmdb_id)}}
        )
        self.summary_collection.delete(ids=[str(tmdb_id)])
