# subliminalsubsdl.py
import subliminal
from subliminal import download_best_subtitles, Video
from babelfish import Language
from pathlib import Path
import pysubs2
import io
import re

def clean_subtitle_text(text):
    text = re.sub(r'^[A-Z]+:', '', text).strip()
    text = re.sub(r'\([^)]*\)', '', text).strip()
    text = re.sub(r'<[^>]*>', '', text).strip()
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_text_from_bytes(subtitle_bytes, encoding='utf-8'):
    try:
        subs = pysubs2.load(io.BytesIO(subtitle_bytes), encoding=encoding)
        return [clean_subtitle_text(line.text) for line in subs if line.text.strip()]
    except Exception as e:
        print(f"Failed to parse subtitle bytes: {e}")
        return []

def download_subs_bytes(moviename):
    vidfile = moviename + ".mp4"
    video = Video.fromname(Path(vidfile).name)

    subs = download_best_subtitles([video], {Language('eng')})

    if not subs or video not in subs:
        print("No subtitles found.")
        return []

    for subtitle in subs[video]:
        if subtitle.content:
            dialogue_lines = extract_text_from_bytes(subtitle.content)
            if dialogue_lines:
                return dialogue_lines

    print("No valid subtitles parsed.")
    return []
