from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.endpoints import summary
from src.api.endpoints import deep_dive
from src.api.endpoints import embeddings_generation
from src.api.endpoints import websocket_chat
import re

app = FastAPI(title="FilmSumaRAG API", version="1.0.0")

# CORS configuration for both development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "http://127.0.0.1:3000",  # Alternative localhost
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",  # Production on Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include routers
app.include_router(summary.router, tags=["Summary"])
app.include_router(deep_dive.router, tags=["Deep Dive"])
app.include_router(embeddings_generation.router, tags=["Embeddings"])
app.include_router(websocket_chat.router, tags=["WebSocket Chat"])

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "FilmSumaRAG API is running",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "summary": "/summarize",
            "embeddings": "/generate_embeddings",
            "check": "/check_embeddings/{movie}",
            "websocket": "/ws/chat/{movie}"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
