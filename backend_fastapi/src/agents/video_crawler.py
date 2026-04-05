import os
import requests
from typing import List, Dict, Optional
from langchain_core.messages import HumanMessage
from src.core.llm_model import llm

class VideoEssayAgent:
    def __init__(self, perplexity_key: Optional[str] = None):
        self.perplexity_key = perplexity_key or os.getenv("PERPLEXITY_KEY")

    async def find_video_essays(self, movie_name: str) -> List[Dict[str, str]]:
        """
        Find video essays on YouTube using Perplexity or a similar search API.
        If no API is available, use LLM to 'propose' some common high-quality essays.
        """
        if self.perplexity_key:
            # Perplexity API integration Example
            # (Requires specific endpoint and payload)
            # return await self._query_perplexity(movie_name)
            pass
        
        # Fallback: Use LLM to 'guess' or 'suggest' high-quality channels/creators
        prompt = f"""You are a cinephile expert. Suggest 3-5 high-quality YouTube video essays or film analysis videos for the movie "{movie_name}".
Include the YouTube title and a direct YouTube link if possible (or a search query).
Focus on reputable channels like 'Every Frame a Painting', 'Lessons from the Screenplay', 'The Royal Ocean Film Society', etc.

Format as a list of dictionaries with 'title' and 'url'.
Example:
[
  {{"title": "The Best Visual Comedy", "url": "https://www.youtube.com/watch?v=..."}},
  ...
]
Only return the JSON list.
"""
        messages = [HumanMessage(content=prompt)]
        response = await llm.ainvoke(messages)
        
        import json
        try:
            # Simple cleanup of response if it's wrapped in markdown
            content = response.content.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()
            
            essays = json.loads(content)
            return essays
        except Exception:
            return [{"title": "Search YouTube for " + movie_name + " video essay", "url": f"https://www.youtube.com/results?search_query={movie_name}+video+essay"}]

    async def _query_perplexity(self, movie_name: str) -> List[Dict[str, str]]:
        # Mock Perplexity integration
        endpoint = "https://api.perplexity.ai/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.perplexity_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "pplx-7b-online",
            "messages": [
                {"role": "system", "content": "You search for YouTube video essays. Only return JSON list of {title, url}."},
                {"role": "human", "content": f"Find best YouTube video essays for the movie {movie_name}."}
            ]
        }
        # response = requests.post(endpoint, headers=headers, json=payload)
        # return response.json()['choices'][0]['message']['content']
        return []
