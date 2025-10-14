from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.core.rag_chat import answer_question

router = APIRouter()

class ChatQuery(BaseModel):
    movie: str
    question: str

@router.post("/deep_dive")
async def deep_dive_chat(payload: ChatQuery):
    try:
        answer = await answer_question(payload.movie, payload.question)
        return {"response": answer}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Embeddings not ready yet. Try again soon.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
