from abc import ABC, abstractmethod
from typing import List, Optional, Dict
import numpy as np

class BaseVectorStore(ABC):
    @abstractmethod
    def add_vectors(self, movie_name: str, chunks: List[str], vectors: np.ndarray) -> None:
        """Add movie vectors to the store."""
        pass

    @abstractmethod
    def search(self, movie_name: str, query_vector: np.ndarray, n_results: int = 3) -> List[Dict]:
        """Search for similar chunks within a specific movie."""
        pass

    @abstractmethod
    def has_movie(self, movie_name: str) -> bool:
        """Check if a movie exists in the database."""
        pass

    @abstractmethod
    def get_movie_data(self, movie_name: str) -> List[Dict]:
        """Retrieve all chunks with IDs for a specific movie."""
        pass

    @abstractmethod
    def delete_movie(self, movie_name: str) -> None:
        """Delete a movie and its vectors from the store."""
        pass

    @abstractmethod
    def add_movie_summary_vector(self, movie_name: str, summary_text: str, vector: np.ndarray) -> None:
        """Stores the full-movie summary for similarity recommendations."""
        pass

    @abstractmethod
    def get_similar_movies(self, movie_name: str, n_results: int = 5) -> List[Dict]:
        """Finds semantically similar movies in the collection."""
        pass
