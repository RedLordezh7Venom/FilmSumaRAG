import os, pickle
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter

embedder = SentenceTransformer("all-MiniLM-L6-v2")

def build_embeddings(movie_name: str, text: str):
    """
    Build embeddings from text and save to disk
    
    Args:
        movie_name: Name of the movie (with year)
        text: Full text to create embeddings from
    """
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = splitter.split_text(text)
    vectors = embedder.encode(chunks, convert_to_tensor=False)
    data = {"chunks": chunks, "vectors": vectors}

    # Ensure directory exists
    os.makedirs("data/embeddings", exist_ok=True)
    
    # Save embeddings
    filepath = f"data/embeddings/{movie_name}.pkl"
    with open(filepath, "wb") as f:
        pickle.dump(data, f)
    
    print(f"✅ Embeddings saved for {movie_name} ({len(chunks)} chunks)")
    return len(chunks)

def load_embeddings(movie_name: str):
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
