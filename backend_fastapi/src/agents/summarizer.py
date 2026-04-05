from typing import List, AsyncIterator
from langchain_core.messages import HumanMessage, SystemMessage
from src.core.llm_model import llm

class MovieSummarizer:
    @staticmethod
    async def summarize_transcript(transcript: str, movie_name: str) -> str:
        # Split transcript into manageable chunks (approx 3000 words each)
        words = transcript.split()
        chunk_size = 3000
        chunks = [" ".join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]
        
        chunk_summaries = []
        for i, chunk in enumerate(chunks):
            prompt = f"""You are a Master Film Summarizer. You are processing part {i+1} of the transcript for "{movie_name}".
Summarize the key plot points, character developments, and major dialogues in this section. 
Maintain a narrative flow that can be easily combined with other parts.

PART {i+1} CONTENT:
{chunk}
"""
            messages = [
                SystemMessage(content="You provide detailed, narrative-style movie summaries."),
                HumanMessage(content=prompt)
            ]
            response = await llm.ainvoke(messages)
            chunk_summaries.append(response.content)
            
        # Combine summaries
        combined_summaries = "\n\n".join(chunk_summaries)
        
        final_prompt = f"""You are a Master Film Critic and Storyteller. You have been given several partial summaries of the movie "{movie_name}".
Your task is to synthesize these into a single, cohesive, and compelling full plot summary.
The summary should be structured into:
1. **Introduction & Premise**
2. **Rising Action & Key Developments**
3. **Climax & Resolution**
4. **Thematic Significance**

Ensure the transition between events is smooth and the tone is professional yet engaging.

PARTIAL SUMMARIES:
{combined_summaries}
"""
        messages = [
            SystemMessage(content="You specialize in synthesizing complex narratives into cohesive summaries."),
            HumanMessage(content=final_prompt)
        ]
        final_response = await llm.ainvoke(messages)
        return final_response.content

    @staticmethod
    async def summarize_stream(transcript: str, movie_name: str) -> AsyncIterator[str]:
        # Simple streaming summary for immediate feedback
        words = transcript.split()
        chunk_size = 4000
        first_chunk = " ".join(words[:chunk_size])
        
        prompt = f"""You are a Master Film Summarizer. Provide a high-level summary of the movie "{movie_name}" based on this transcript excerpt.
Focus on capturing the essence of the story.

EXCERPT:
{first_chunk}
"""
        messages = [HumanMessage(content=prompt)]
        async for token in llm.astream(messages):
            if hasattr(token, 'content'):
                yield token.content
