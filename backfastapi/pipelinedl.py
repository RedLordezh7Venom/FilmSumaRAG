from subliminsubs import download_subs
from subtitlepreprocess import main

filename = input("Enter name of the movie")
vidfile = filename  + ".mp4"
subfile = filename+".en.srt"
with open (vidfile,"wb") as f:
    pass

download_subs(vidfile) #Downloaded and saved as .en.srt
main(subfile)
