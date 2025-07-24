import subliminal
from subliminal import save_subtitles, download_best_subtitles,Video
from src.utils.file_operations import delete_files
from babelfish import Language
from pathlib import Path
import os

# Supported subtitle extensions
SUB_EXTS = ['srt','ass', 'ssa', 'sub', 'mpl2', 'tmp', 'vtt', 'ttml', 'sami']

def find_existing_sub(movie_path):
    stem = Path(movie_path).stem
    folder = Path(movie_path).parent
    for ext in SUB_EXTS:
        found = list(folder.glob(f"{stem}.en.{ext}"))
        if found:
            print(found[0])
            return found[0].as_posix()
    return None

def download_subs(moviename):
    vidfile = moviename + ".mp4"

    #Create video object instead of dummy file
    video = Video.fromname(Path(vidfile).name) 

    if (sub := find_existing_sub(vidfile)):
        print(f"Found existing subtitle: {sub}")
        return sub

    subs = download_best_subtitles([video], {Language('eng')})
    if subs and video in subs:
        save_subtitles(video, subs[video])
        sub_path = find_existing_sub(vidfile)
        print("Subtitles downloaded and saved to ." + sub_path)
        print(sub_path)
        delete_files(vidfile)
        return sub_path
    else:
        print("No subtitles found.")
