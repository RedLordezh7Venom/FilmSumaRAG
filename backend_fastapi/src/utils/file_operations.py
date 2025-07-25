# file_operations.py (reduced version)
from langchain.text_splitter import RecursiveCharacterTextSplitter

def split_text_into_chunks_from_text(text: str, chunk_size=20000, chunk_overlap=2000):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    return splitter.split_text(text)
