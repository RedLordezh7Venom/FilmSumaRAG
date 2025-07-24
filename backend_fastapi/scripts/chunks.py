def split_text_into_chunks(file_path, chunk_size=1000):
    # Read the text file
    with open(file_path, 'r', encoding='utf-8') as file:
        text = file.read()

    # Tokenize the text (split into words)
    tokens = text.split()

    # Split tokens into chunks of 1000 tokens each
    chunks = [' '.join(tokens[i:i + chunk_size]) for i in range(0, len(tokens), chunk_size)]

    return chunks

# Example usage
file_path = 'interstellar.en_text.txt'
chunks = split_text_into_chunks(file_path, chunk_size=1000)

# Print the chunks
for i, chunk in enumerate(chunks):
    print(f"Chunk {i + 1}:\n{chunk}\n")