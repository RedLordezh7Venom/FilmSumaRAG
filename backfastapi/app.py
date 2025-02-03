from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from typing import List
import os
from dotenv import load_dotenv
import chardet

from subliminsubs import download_subs
from subtitlepreprocess import process

load_dotenv()

app = FastAPI()
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-pro')

#enable some safety settings for full summary of movies
safety_settings = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_NONE",  # Allow all content in this category
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_NONE",  
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_NONE",  # Block none, for A ,NC-17, rated
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_NONE",  # moviecontent
    },
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MovieName(BaseModel):
    moviename: str

def detect_encoding(file_path):
    """Detect the encoding of a file."""
    with open(file_path, 'rb') as f:
        raw_data = f.read()
    result = chardet.detect(raw_data)
    return result['encoding']

def split_text_into_chunks(file_path, encoding,chunk_size=2000):
    with open(file_path, 'r', encoding=encoding) as file:
        text = file.read()

    # Tokenize the text (split into words)
    tokens = text.split()

    # Split tokens into chunks of 1000 tokens each
    chunks = [' '.join(tokens[i:i + chunk_size]) for i in range(0, len(tokens), chunk_size)]

    return chunks

async def generate_summary(chunks):
    # Process each chunk with Gemini
    summaries = []
    for chunk in chunks:
        prompt = f"summarize this part of the joker movie and narrate it \n{chunk}"
        response = model.generate_content(prompt,safety_settings=safety_settings,)
        print(response.text)
        summaries.append(response.text)

    # Final summary
    # final_prompt = f"Create a coherent movie narration from these segment summaries:\n{''.join(summaries)}"
    # final_summary = model.generate_content(final_prompt)
    final_summary = ' '.join(summaries)
    return final_summary

def delete_files(file_paths):
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"Deleted file: {file_path}")  # Debugging
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}") 


@app.post('/summarize')
async def summarize_movie(movie: MovieName):
    try:
        moviename = movie.moviename
        print(f"Processing movie: {moviename}")  # Debugging

        vidfile = moviename + ".mp4"
        subfile = moviename + ".en.srt"
        final_file = moviename + ".en_text.txt"

        #create dummy videofile for subliminal subs
        with open(vidfile, "wb") as f:
            pass

        # Download subtitles
        print("Downloading subtitles...")  # Debugging
        download_subs(vidfile)  # Downloaded and saved as .en.srt

        # Process subtitles
        print("Processing subtitles...")  # Debugging
        process(subfile)
        encoding = detect_encoding(final_file)

        # Split text into chunks
        print("Splitting text into chunks...")  # Debugging
        chunks = split_text_into_chunks(final_file,encoding)

        delete_files([vidfile, subfile, final_file])
        print("Generating summary...")  # Debugging
        summary = await generate_summary(chunks)

        return summary
    except FileNotFoundError as e:
        print(f"File not found: {e}")  # Debugging
        raise HTTPException(status_code=404, detail=f"File not found: {e.filename}")
    except Exception as e:
        print(f"Error: {e}")  # Debugging
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)