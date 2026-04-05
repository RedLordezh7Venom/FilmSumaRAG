from duckduckgo_search import DDGS
from typing import List, Dict
import os
import re

class ResearchAgent:
    """
    The Research Agent is responsible for finding external context (video essays, 
    critic reviews, IMDb metadata) to supplement the RAG-based transcript analysis.
    """
    
    @staticmethod
    def search_video_essays(movie_title: str, limit: int = 5) -> List[Dict]:
        """
        Search for popular video essays on YouTube/Vimeo about the movie.
        Returns [{'title': title, 'url': url}]
        """
        search_query = f"{movie_title} film video essay analysis"
        results = []
        
        with DDGS() as ddgs:
            # We filter for video results
            ddgs_gen = ddgs.videos(
                search_query, 
                region='wt-wt', 
                safesearch='off', 
                size=None, 
                resolution=None, 
                duration=None, 
                license=None, 
                max_results=limit
            )
            for r in ddgs_gen:
                results.append({
                    "title": r['title'],
                    "url": r['content'],
                    "description": r.get('description', ''),
                    "thumbnail": r.get('images', {}).get('medium', '')
                })
        
        return results

    @staticmethod
    def get_film_metadata(movie_title: str) -> Dict:
        """
        Search for IMDb/TMDb metadata (Year, Director, Starring).
        """
        search_query = f"{movie_title} film imdb details cast"
        
        imdb_data = {
            "director": "Unknown",
            "cast": [],
            "rating": "N/A"
        }
        
        with DDGS() as ddgs:
            ddgs_text_gen = ddgs.text(search_query, max_results=3)
            for r in ddgs_text_gen:
                body = r.get('body', '').lower()
                
                # Simple heuristic extraction
                if "directed by" in body:
                    match = re.search(r"directed by ([\w\s]+)", body)
                    if match: imdb_data["director"] = match.group(1).title()
                
                if "starring" in body:
                    match = re.search(r"starring ([\w\s,]+)", body)
                    if match: imdb_data["cast"] = [c.strip().title() for c in match.group(1).split(",")[:3]]
        
        return imdb_data

    @staticmethod
    def generate_research_summary(movie_title: str, findings: List[Dict]) -> str:
        """
        Synthesizes the search findings into a coherent summary.
        (Usually called by the LLM).
        """
        summary = f"### External Research for {movie_title}\n\n"
        summary += "Based on our latest research, here are the top 5 video essays and analyses that deepen the understanding of this film:\n\n"
        
        for i, f in enumerate(findings):
            summary += f"{i+1}. **{f['title']}**\n"
            summary += f"   - [Watch Here]({f['url']})\n"
            if f.get('description'):
                summary += f"   - Note: {f['description'][:150]}...\n"
        
        return summary
