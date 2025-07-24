from src.utils.subliminalsubsdl import download_subs
from src.utils.sub_preprocess import process as process_sub
from src.utils.file_operations import detect_encoding, split_text_into_chunks, delete_files
from src.core.llm_model import generate_summary
import os

async def get_movie_summary(moviename: str):

    # Download subtitles
    print("Downloading subtitles...")
    subfile = download_subs(moviename)

    # Process subtitles
    print("Processing subtitles...")
    final_file = process_sub(subfile)
    print("preprocessed")
    encoding = detect_encoding(final_file)
    # Split text into chunks
    print("Splitting text into chunks...")
    chunks = split_text_into_chunks(final_file, encoding)

    delete_files([subfile, final_file])
    print("Generating summary...")
    summary = await generate_summary(chunks)

    return summary
