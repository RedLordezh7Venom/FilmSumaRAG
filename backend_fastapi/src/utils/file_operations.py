import os
import chardet

def detect_encoding(file_path):
    """Detect the encoding of a file."""
    with open(file_path, 'rb') as f:
        raw_data = f.read()
    result = chardet.detect(raw_data)
    return result['encoding']

def split_text_into_chunks(file_path, encoding,chunk_size=500):
    with open(file_path, 'r', encoding=encoding,errors = 'ignore') as file:
        text = file.read()

    # Tokenize the text (split into words)
    tokens = text.split()

    # Split tokens into chunks of 1000 tokens each
    chunks = [' '.join(tokens[i:i + chunk_size]) for i in range(0, len(tokens), chunk_size)]

    return chunks

def delete_files(file_paths):
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"Deleted file: {file_path}")  # Debugging
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")
