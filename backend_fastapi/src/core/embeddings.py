import os, pickle
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter

embedder = SentenceTransformer("all-MiniLM-L6-v2")

def build_embeddings(movie_name: str, text: str):
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = splitter.split_text(text)
    vectors = embedder.encode(chunks, convert_to_tensor=False)
    data = {"chunks": chunks, "vectors": vectors}

    os.makedirs("data/embeddings", exist_ok=True)
    with open(f"data/embeddings/{movie_name}.pkl", "wb") as f:
        pickle.dump(data, f)
    print(f"✅ Embeddings saved for {movie_name}")

def load_embeddings(movie_name: str):
    path = f"data/embeddings/{movie_name}.pkl"
    if not os.path.exists(path):
        raise FileNotFoundError("Embeddings not found for this movie")
    with open(path, "rb") as f:
        return pickle.load(f)
