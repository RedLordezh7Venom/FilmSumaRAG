# subliminalsubsdl.py
import subliminal
from subliminal import download_best_subtitles, Video
from babelfish import Language
from pathlib import Path
import pysubs2
import io
import re
  
def clean_text(t: str) -> str:
    t = re.sub(r'^[A-Z]+:', '', t).strip()
    t = re.sub(r'\([^)]*\)', '', t).strip()
    t = re.sub(r'<[^>]*>', '', t).strip()
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def extract_text_from_bytes(subtitle_bytes: bytes, encoding='utf-8'):
    try:
        raw_str = subtitle_bytes.decode(encoding, errors='ignore')
    except Exception as e:
        print(f"Decode failed: {e}")
        return []

    try:
        subs = pysubs2.SSAFile.from_string(raw_str)
    except Exception as e:
        print("Parsing from string failed:", e)
        return []

    return [clean_text(event.text) for event in subs if event.text.strip()]

def download_subs_lines(moviename):
    vidfile = moviename + ".mp4"
    video = Video.fromname(Path(vidfile).name)
    subs = download_best_subtitles([video], {Language('eng')})
    for subtitle in subs[video]:
        if subtitle.content:
            lines = extract_text_from_bytes(subtitle.content)
            if lines:
                return lines
    return []
