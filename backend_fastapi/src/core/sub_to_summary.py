# sub_to_summary.py
from src.utils.subliminalsubsdl import download_subs_lines
from src.utils.file_operations import split_text_into_chunks_from_text
from src.core.llm_model import generate_summary

async def get_movie_summary(moviename: str):
    print("Downloading subtitles...")
    dialogue_lines = download_subs_lines(moviename)

    if not dialogue_lines:
        print("No subtitle data found.")
        return None

    print("Processing subtitles...")
    full_text = "\n".join(dialogue_lines)

    print("Splitting text into chunks...")
    chunks = split_text_into_chunks_from_text(full_text)

    print("Generating summary...")
    summary = await generate_summary(chunks)

    return summary
