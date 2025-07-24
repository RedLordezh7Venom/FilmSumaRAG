import os
import chardet
from langchain.text_splitter import RecursiveCharacterTextSplitter

def detect_encoding(file_path):
    """Detect the encoding of a file."""
    with open(file_path, 'rb') as f:
        raw_data = f.read()
    result = chardet.detect(raw_data)
    return result['encoding']

def split_text_into_chunks(file_path, encoding,chunk_size=2000,chunk_overlap = 200):
    with open(file_path, 'r', encoding=encoding,errors = 'ignore') as file:
        text = file.read()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""]
    )

    # Split the text into chunks
    chunks = splitter.split_text(text)

    return chunks

def delete_files(file_paths):
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"Deleted file: {file_path}")  # Debugging
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")
