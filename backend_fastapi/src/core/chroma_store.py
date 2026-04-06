import chromadb
import numpy as np
import os
from typing import List, Dict, Optional
from src.core.vector_store_base import BaseVectorStore

class ChromaVectorStore(BaseVectorStore):
    def __init__(self, collection_name: str = "movie_dialogues"):
        # Initialize persistent client
        self.chroma_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_db")
        self.client = chromadb.PersistentClient(path=self.chroma_path)
        self.collection = self.client.get_or_create_collection(name=collection_name)
        
        # New collection for full movie summaries (for recommendations)
        self.summary_collection = self.client.get_or_create_collection(name="movie_summaries")

    def add_vectors(self, movie_name: str, chunks: List[str], vectors: np.ndarray) -> None:
        count = len(chunks)
        ids = [f"{movie_name}_{i}" for i in range(count)]
        metadatas = [{"movie_name": movie_name, "chunk_index": i} for i in range(count)]
        
        self.collection.upsert(
            ids=ids,
            embeddings=vectors.tolist(),
            documents=chunks,
            metadatas=metadatas
        )
        print(f"[STORE] ChromaStore: Upserted {count} chunks for {movie_name}")
        
    def add_movie_summary_vector(self, movie_name: str, summary_text: str, vector: np.ndarray) -> None:
        """Stores the full-movie summary for similarity cross-referencing."""
        self.summary_collection.upsert(
            ids=[movie_name],
            embeddings=[vector.tolist()],
            documents=[summary_text],
            metadatas=[{"movie_name": movie_name}]
        )
        print(f"[STORE] ChromaStore: Saved summary vector for {movie_name}")

    def get_similar_movies(self, movie_name: str, n_results: int = 5) -> List[Dict]:
        """Finds movies similar to the given one using semantic summary distance."""
        # Get target vector
        target = self.summary_collection.get(ids=[movie_name], include=['embeddings'])
        if not target['embeddings']: return []
        
        results = self.summary_collection.query(
            query_embeddings=target['embeddings'],
            n_results=n_results + 1, # +1 to exclude itself
        )
        
        # Filter out the source movie and format
        matches = []
        for id, dist in zip(results['ids'][0], results['distances'][0]):
            if id != movie_name:
                matches.append({"movie_name": id, "distance": dist})
        
        return matches

    def search(self, movie_name: str, query_vector: np.ndarray, n_results: int = 3) -> List[Dict]:
        results = self.collection.query(
            query_embeddings=[query_vector.tolist()],
            n_results=n_results,
            where={"movie_name": {"$eq": movie_name}}
        )
        
        if results['documents'] and len(results['documents']) > 0:
            return [{"id": id, "text": doc} for id, doc in zip(results['ids'][0], results['documents'][0])]
        return []

    def has_movie(self, movie_name: str) -> bool:
        result = self.collection.get(
            where={"movie_name": {"$eq": movie_name}},
            limit=1
        )
        return len(result['ids']) > 0

    def get_movie_data(self, movie_name: str) -> List[Dict]:
        results = self.collection.get(
            where={"movie_name": {"$eq": movie_name}}
        )
        return [{"id": id, "text": doc} for id, doc in zip(results['ids'], results['documents'])]

    def get_movie_documents(self, movie_name: str) -> List[str]:
        # Backwards compatibility helper
        data = self.get_movie_data(movie_name)
        return [d["text"] for d in data]

    def delete_movie(self, movie_name: str) -> None:
        self.collection.delete(
            where={"movie_name": {"$eq": movie_name}}
        )
