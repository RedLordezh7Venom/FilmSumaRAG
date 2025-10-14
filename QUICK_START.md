# RAG Deep Dive - Quick Start Guide

## Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

## Backend Setup

### 1. Install Dependencies
```bash
cd backend_fastapi
pip install -r requirements.txt
```

This will install:
- FastAPI & Uvicorn (Web framework)
- WebSockets (Real-time communication)
- SentenceTransformers (Embeddings)
- LangChain (LLM framework)
- Subliminal (Subtitle downloads)
- scikit-learn & numpy (Vector operations)

### 2. Configure Environment Variables
Create/update `.env` file:
```env
GROQ_KEY=your_groq_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

Get API keys:
- GROQ: https://console.groq.com/
- Google AI: https://makersuite.google.com/app/apikey

### 3. Create Data Directories (Auto-created, but can do manually)
```bash
mkdir -p data/embeddings
mkdir -p data/summaries
```

### 4. Run Backend Server
```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Server will start at: `http://localhost:8000`

### 5. Verify Backend
Open browser: `http://localhost:8000/docs`

You should see API documentation with these endpoints:
- POST `/summarize`
- POST `/deep_dive`
- POST `/generate_embeddings`
- GET `/check_embeddings/{movie}`
- WS `/ws/chat/{movie}`

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend_next
npm install
```

### 2. Configure Environment Variables
Create/update `.env.local`:
```env
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

Get TMDB API key:
- Register at: https://www.themoviedb.org/
- Go to Settings → API
- Copy "API Key (v3 auth)"

### 3. Run Frontend Server
```bash
npm run dev
```

Frontend will start at: `http://localhost:3000`

## Testing the RAG Feature

### Step-by-Step Test

#### 1. Search for a Movie
- Open `http://localhost:3000`
- Type a movie name (e.g., "The Matrix")
- Click on a suggestion or press Enter

#### 2. Access Deep Dive
- Click the "Deep Dive" button on the movie card
- You'll be redirected to `/deep-dive/{movieId}`

#### 3. Wait for Embeddings
**First Time (No Embeddings):**
- You'll see: "Generating embeddings from subtitles... This may take a minute."
- Backend is:
  1. Downloading subtitles
  2. Processing text
  3. Creating embeddings
  4. Saving to disk
- This takes 30 seconds to 2 minutes

**Subsequent Times:**
- Embeddings are cached
- Chat is ready immediately
- You'll see: "Deep Dive is ready!"

#### 4. Ask Questions
Try these example questions:
- "What is the main plot?"
- "Who are the main characters?"
- "What happens at the end?"
- "What is Neo's journey?"
- "Explain the red pill scene"

### Expected Behavior

**Good Response:**
```
User: "What is the main plot?"
AI: "The main plot revolves around Neo, a computer hacker who discovers 
that reality as he knows it is actually a simulation called the Matrix..."
```

**Error Handling:**
- If subtitles aren't available: "Sorry, subtitles not found"
- If connection drops: "Connection lost. Please refresh the page."
- If timeout: "Embeddings generation took too long"

## Testing with cURL

### Check if Embeddings Exist
```bash
curl "http://localhost:8000/check_embeddings/The%20Matrix%20(1999)"
```

Response:
```json
{
  "exists": false,
  "movie": "The Matrix (1999)",
  "status": "not_found"
}
```

### Generate Embeddings
```bash
curl -X POST "http://localhost:8000/generate_embeddings" \
  -H "Content-Type: application/json" \
  -d '{"movie": "The Matrix (1999)"}'
```

Response:
```json
{
  "status": "processing",
  "message": "Embeddings generation started for The Matrix (1999)"
}
```

### Test WebSocket (Using websocat or wscat)
```bash
# Install websocat: https://github.com/vi/websocat
websocat "ws://localhost:8000/ws/chat/The%20Matrix%20(1999)"

# Then send:
{"question": "What is the main plot?"}
```

## Common Issues & Solutions

### Issue 1: "Embeddings not ready yet"
**Solution:** Wait for embeddings generation to complete (check backend logs)

### Issue 2: "No subtitle data found"
**Solution:** 
- Try a different movie
- Check if movie name format is correct: "Title (Year)"
- Verify internet connection for subtitle download

### Issue 3: WebSocket connection fails
**Solution:**
- Check if backend is running
- Verify CORS settings in `main.py`
- Check browser console for errors
- Try with a different browser

### Issue 4: Backend crashes during embeddings
**Solution:**
- Check available RAM (needs ~1-2GB)
- Verify all dependencies installed correctly
- Check backend logs for specific error

### Issue 5: Frontend shows "Error loading Deep Dive"
**Solution:**
- Check NEXT_PUBLIC_FASTAPI_URL in `.env.local`
- Verify backend is accessible
- Check browser console for network errors

## Verifying Installation

### Backend Health Check
```bash
# Should return API docs
curl http://localhost:8000/docs
```

### Frontend Health Check
```bash
# Should return 200
curl http://localhost:3000
```

### WebSocket Test
```javascript
// Run in browser console on http://localhost:3000
const ws = new WebSocket('ws://localhost:8000/ws/chat/Test%20Movie%20(2024)');
ws.onopen = () => console.log('✅ WebSocket connected');
ws.onerror = (e) => console.error('❌ WebSocket error', e);
```

## Performance Benchmarks

### Embeddings Generation
- **Small movie** (~5,000 subtitle lines): ~30 seconds
- **Medium movie** (~10,000 lines): ~1 minute
- **Large movie** (~15,000 lines): ~2 minutes

### Query Response Time
- **Embedding query**: ~100ms
- **Finding similar chunks**: ~50ms
- **LLM response**: ~1-2 seconds
- **Total**: ~1.5-2.5 seconds

### Storage
- **Per movie embeddings**: 1-5 MB
- **100 movies**: ~250 MB

## Development Tips

### Watch Backend Logs
```bash
# Run with more verbose logging
uvicorn src.main:app --reload --log-level debug
```

### Monitor WebSocket Connections
Check browser DevTools → Network → WS tab

### Clear Embeddings Cache
```bash
rm -rf backend_fastapi/data/embeddings/*
```

### Test Different Movies
Recommended test movies (good subtitle availability):
- The Matrix (1999)
- Inception (2010)
- Interstellar (2014)
- The Dark Knight (2008)
- Pulp Fiction (1994)

## Production Deployment

### Environment Variables (Production)
```env
# Backend
GROQ_KEY=prod_key
GOOGLE_API_KEY=prod_key

# Frontend
NEXT_PUBLIC_TMDB_API_KEY=prod_key
NEXT_PUBLIC_FASTAPI_URL=https://your-api-domain.com
```

### CORS Configuration
Update `main.py` for production domains:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
```

### WebSocket in Production
- Use `wss://` instead of `ws://`
- Ensure SSL certificates are valid
- Configure nginx/load balancer for WebSocket support

## Next Steps

1. ✅ Test with multiple movies
2. ✅ Verify embeddings persistence
3. ✅ Test concurrent users
4. 📝 Add user feedback mechanism
5. 📝 Implement caching strategies
6. 📝 Add analytics/logging

## Support

For issues or questions:
1. Check backend logs
2. Check browser console
3. Review this guide
4. Check `RAG_IMPLEMENTATION.md` for technical details

## Success Criteria

Your installation is successful if:
- ✅ Backend starts without errors
- ✅ Frontend loads at localhost:3000
- ✅ Movie search works
- ✅ Deep Dive button appears
- ✅ Embeddings generate successfully
- ✅ Chat responds to questions
- ✅ Answers are relevant to the movie

Enjoy your RAG-powered movie Q&A system! 🎬🤖
