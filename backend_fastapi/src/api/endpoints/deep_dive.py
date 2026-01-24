from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from src.core.rag_chat import answer_question_stream
import json

router = APIRouter()

class ChatQuery(BaseModel):
    tmdb_id: str
    movie_title: str
    question: str

@router.post("/deep_dive")
async def deep_dive_chat(payload: ChatQuery):
    try:
        # stream tokens with sse
        async def event_generator():
            async for token in answer_question_stream(payload.tmdb_id, payload.movie_title, payload.question):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Embeddings not ready yet. Try again soon.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))