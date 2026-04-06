from typing import List, Dict
from src.core.llm_model import llm
from langchain_core.messages import HumanMessage
import json

class ResearchAgent:
    @staticmethod
    def search_video_essays(movie_title: str) -> List[Dict]:
        """
        Mock search logic (would use Perplexity/Search API in prod).
        Returns titles and descriptions of found essays.
        """
        # For now, we use the LLM to 'research' the best essays available on the net
        prompt = f"Find 3 authoritative video essays or critical analyses for the movie '{movie_title}'. Return as a JSON list of objects with 'title' and 'description'."
        messages = [HumanMessage(content=prompt)]
        try:
            response = llm.invoke(messages)
            content = response.content.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            return json.loads(content)
        except:
            return []

    @staticmethod
    def generate_research_summary(movie_title: str, findings: List[Dict]) -> str:
        """
        Synthesizes findings into a clean text block for RAG injection.
        """
        if not findings:
            return f"No external video essays were found for {movie_title} at this time."
        
        summary = f"### EXTERNAL CRITICAL ANALYSIS: {movie_title}\n"
        for f in findings:
            summary += f"- **{f.get('title')}**: {f.get('description')}\n"
        
        return summary
