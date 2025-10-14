from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.endpoints import summary
from src.api.endpoints import deep_dive
from src.api.endpoints import embeddings_generation
from src.api.endpoints import websocket_chat
import re

app = FastAPI()

 
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(summary.router)
app.include_router(deep_dive.router)
app.include_router(embeddings_generation.router)
app.include_router(websocket_chat.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
