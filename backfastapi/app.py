from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import aiohttp
import asyncio
from bs4 import BeautifulSoup
import google.generativeai as genai
from typing import List
import re
import os
from dotenv import load_dotenv

from subliminsubs import download_subs
from subtitlepreprocess import process


load_dotenv()  
 

app = FastAPI()
genai.configure(api_key = os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-pro')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# async def fetch_subtitles(title: str, year: int) -> str:
#     async with aiohttp.ClientSession() as session:
#         # Search OpenSubtitles (replace with actual API endpoint)
#         search_url = f"https://www.opensubtitles.org/en/search2/sublanguageid-eng/moviename-{title}/year-{year}"
#         async with session.get(search_url) as response:
#             if response.status != 200:
#                 raise HTTPException(status_code=404, detail="Subtitles not found")
#             html = await response.text()

#         # Parse and extract subtitle text
#         soup = BeautifulSoup(html, 'html.parser')
#         subtitle_text = soup.get_text()
#         return subtitle_text

# def preprocess_subtitles(text: str) -> List[str]:
#     # Remove timestamps and subtitle numbers
#     clean_text = re.sub(r'\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}', '', text)
#     clean_text = re.sub(r'^\d+$', '', clean_text, flags=re.MULTILINE)
    
#     # Split into chunks of ~1000 tokens
#     chunks = [clean_text[i:i+4000] for i in range(0, len(clean_text), 4000)]
#     return chunks

def split_text_into_chunks(file_path, chunk_size=1000):
    # Read the text file
    with open(file_path, 'r', encoding='utf-8') as file:
        text = file.read()

    # Tokenize the text (split into words)
    tokens = text.split()

    # Split tokens into chunks of 1000 tokens each
    chunks = [' '.join(tokens[i:i + chunk_size]) for i in range(0, len(tokens), chunk_size)]

    return chunks

async def generate_summary(chunks):
    #process each chunk with gemini
    summaries = []
    for chunk in chunks:
        prompt = f"Summarize this part of the movie subtitles and narrate like a storyteller, focusing on key plot points:\n{chunk}"
        response = model.generate_content(prompt)
        summaries.append(response.text)

    #Final summary
    final_prompt = f"Create a coherent movie narration from these segment summaries:\n{''.join(summaries)}"
    final_summary = model.generate_content(final_prompt)
    return final_summary.text


@app.post('/summarize')
async def summarize_movie(moviename):
    try:
        vidfile = moviename + ".mp4"
        subfile = moviename+".en.srt"
        with open (vidfile,"wb") as f:
            pass

        download_subs(vidfile) #Downloaded and saved as .en.srt
        process(subfile)
        final_file = moviename+".en_text.txt"
        chunks = split_text_into_chunks(final_file)

        summary = await generate_summary(chunks)
        if not summary:
            raise HTTPException(status_code=500, detail="Failed to generate summary")
            
        return Summary(summary=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)