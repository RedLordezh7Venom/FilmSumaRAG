import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-2.0-flash-lite')

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

async def generate_summary(chunks):
    # Process each chunk with Gemini
    summaries = []
    for chunk in chunks:
        prompt = f"You are tasked with summarizing movie for a website called Film -a Sum , summarize this part of the movie, only respond with summary text \n{chunk}"
        response = model.generate_content(prompt,safety_settings=safety_settings,)
        print(response.text)
        summaries.append(response.text)

    # Final summary
    # final_prompt = f"Create a coherent movie narration from these segment summaries:\n{''.join(summaries)}"
    # final_summary = model.generate_content(final_prompt)
    final_summary = ' '.join(summaries)
    return final_summary
