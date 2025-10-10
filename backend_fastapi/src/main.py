from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "https://film-suma-rag.vercel.app",
    "https://film-suma-rag-frontend-inky.vercel.app",
    "https://filmsumarag-frontend.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
async def root():
    return {"message": "Hello from FastAPI"}

# Example async endpoint
@app.post("/summarize")
async def summarize(data: dict):
    # async I/O calls here
    return {"summary": "result"}
