import subliminal
from subliminal import save_subtitles
from babelfish import Language
from pathlib import Path

def download_subs(movie_file):
    video = subliminal.scan_video(movie_file)

    subtitles = subliminal.download_best_subtitles([video], {Language('eng')})

    # Save the subtitle to a file
    if subtitles and video in subtitles:
        save_subtitles(video, subtitles[video])
        print(f"Subtitles downloaded and saved as {Path(movie_file).stem}.en.srt")
    else:
        print("No subtitles found for the given movie.")

if __name__ == '__main__':
    download_subs("star wars episode 1.mp4")  # Update the filename if needed


