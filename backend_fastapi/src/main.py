from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from src.api.endpoints import summary
from src.api.endpoints import deep_dive
from src.api.endpoints import embeddings_generation
from src.api.endpoints import websocket_chat
import time

app = FastAPI(title="FilmSumaRAG API", version="1.0.0")

# Robust CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"DEBUG: {request.method} {request.url}")
    try:
        response = await call_next(request)
        print(f"DEBUG: Response status: {response.status_code}")
        return response
    except Exception as e:
        print(f"DEBUG: Error processing request: {e}")
        raise

# Include routers
app.include_router(summary.router, tags=["Summary"])
app.include_router(deep_dive.router, tags=["Deep Dive"])
app.include_router(embeddings_generation.router, tags=["Embeddings"])
app.include_router(websocket_chat.router, tags=["WebSocket Chat"])

@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
