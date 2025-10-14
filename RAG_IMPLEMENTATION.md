# RAG Deep Dive Feature Implementation

## Overview
This implementation adds a complete RAG (Retrieval-Augmented Generation) system to the FilmSumaRAG project, enabling users to have interactive Q&A conversations about movies using subtitle data.

## Features Implemented

### 1. **Embeddings Generation** (`/generate_embeddings` endpoint)
- **Trigger**: When user clicks "Deep Dive" button in frontend
- **Process**:
  - Downloads subtitles using `subliminalsubsdl.py`
  - Converts entire subtitle text into embeddings using SentenceTransformer (`all-MiniLM-L6-v2`)
  - Stores embeddings as `.pkl` files in `data/embeddings/` directory
  - Runs as a background task to avoid blocking the UI
- **File**: `backend_fastapi/src/api/endpoints/embeddings_generation.py`

### 2. **Embeddings Status Check** (`/check_embeddings/{movie}` endpoint)
- Allows frontend to verify if embeddings are ready
- Returns status: `ready` or `not_found`
- **File**: `backend_fastapi/src/api/endpoints/embeddings_generation.py`

### 3. **WebSocket RAG Chat** (`/ws/chat/{movie}` endpoint)
- Real-time bidirectional communication for Q&A
- Uses cosine similarity to find relevant subtitle chunks
- Sends questions and receives AI-generated answers in real-time
- **File**: `backend_fastapi/src/api/endpoints/websocket_chat.py`

### 4. **Frontend Integration**
- **Loading States**:
  - "Checking embeddings..." - Initial status check
  - "Generating embeddings from subtitles..." - Shows during embedding creation
  - "Deep Dive is ready!" - When embeddings are ready
- **Real-time Chat**:
  - WebSocket connection for instant responses
  - Message history with user/AI distinction
  - Auto-scrolling chat interface
  - Loading indicators for message sending
- **File**: `frontend_next/app/deep-dive/[movieId]/page.tsx`

## Technical Architecture

### Backend Flow
```
User clicks Deep Dive
    ↓
Frontend calls /check_embeddings
    ↓
If not exists → /generate_embeddings (background task)
    ↓
Download subtitles → Create embeddings → Save to disk
    ↓
Frontend polls /check_embeddings every 5 seconds
    ↓
When ready → Connect WebSocket
    ↓
User asks question → WebSocket /ws/chat/{movie}
    ↓
RAG system finds relevant chunks → LLM generates answer
    ↓
Answer sent back via WebSocket
```

### Key Components

#### Embeddings (`src/core/embeddings.py`)
- Uses `SentenceTransformer` model: `all-MiniLM-L6-v2`
- Text splitting with `RecursiveCharacterTextSplitter`
- Chunk size: 1000 characters
- Chunk overlap: 100 characters

#### RAG Chat (`src/core/rag_chat.py`)
- Loads embeddings from pickle files
- Embeds user question with same model
- Finds top 3 most relevant chunks using cosine similarity
- Constructs prompt with context and question
- Uses LangChain LLM to generate conversational answer

#### WebSocket Handler (`src/api/endpoints/websocket_chat.py`)
- Accepts WebSocket connections per movie
- Receives JSON messages with questions
- Sends JSON responses with answers or errors
- Handles disconnections gracefully

## Installation & Setup

### Backend Dependencies
Install new dependencies:
```bash
cd backend_fastapi
pip install -r requirements.txt
```

New packages added:
- `websockets` - WebSocket support
- `sentence-transformers` - Embeddings generation
- `scikit-learn` - Cosine similarity calculations
- `numpy` - Array operations

### Directory Structure
The system automatically creates these directories:
```
backend_fastapi/
  data/
    embeddings/     # Stores .pkl files with movie embeddings
    summaries/      # Stores movie summaries (existing)
```

## API Endpoints

### 1. Generate Embeddings
```http
POST /generate_embeddings
Content-Type: application/json

{
  "movie": "The Matrix (1999)"
}
```

**Response:**
```json
{
  "status": "processing",
  "message": "Embeddings generation started for The Matrix (1999)"
}
```
or
```json
{
  "status": "ready",
  "message": "Embeddings already exist for The Matrix (1999)"
}
```

### 2. Check Embeddings Status
```http
GET /check_embeddings/{movie}
```

**Example:**
```http
GET /check_embeddings/The%20Matrix%20(1999)
```

**Response:**
```json
{
  "exists": true,
  "movie": "The Matrix (1999)",
  "status": "ready"
}
```

### 3. WebSocket Chat
```
WS /ws/chat/{movie}
```

**Connect:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/chat/The%20Matrix%20(1999)');
```

**Send Message:**
```json
{
  "question": "What is the main theme of the movie?"
}
```

**Receive Response:**
```json
{
  "type": "answer",
  "question": "What is the main theme of the movie?",
  "answer": "The main theme revolves around..."
}
```

**Error Response:**
```json
{
  "type": "error",
  "message": "Embeddings not ready yet. Please wait or try again."
}
```

## Frontend Usage

### User Flow
1. User searches for a movie on home page
2. User clicks "Deep Dive" button
3. Frontend navigates to `/deep-dive/{movieId}`
4. Page automatically:
   - Fetches movie title with year
   - Checks if embeddings exist
   - If not, triggers generation and shows loading screen
   - Polls every 5 seconds until ready
   - Connects WebSocket when ready
5. User can now ask questions in real-time

### Loading States
- **Checking**: Initial verification
- **Generating**: Downloading subtitles and creating embeddings
- **Ready**: Chat is active and ready for questions
- **Error**: Something went wrong

## Configuration

### Environment Variables
Make sure these are set in your `.env`:

**Backend:**
```env
GOOGLE_API_KEY=your_api_key
GROQ_API_KEY=your_groq_key
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_key
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

### WebSocket URL Configuration
The frontend automatically converts HTTP URLs to WebSocket URLs:
- `http://localhost:8000` → `ws://localhost:8000`
- `https://api.example.com` → `wss://api.example.com`

## Error Handling

### Backend
- **FileNotFoundError**: Embeddings don't exist yet
- **WebSocketDisconnect**: Client closed connection
- **General Exceptions**: Logged and sent as error messages

### Frontend
- **Connection Lost**: Shows message to refresh page
- **Timeout**: 5-minute timeout for embeddings generation
- **API Errors**: Displays user-friendly error messages

## Performance Considerations

### Embeddings Generation
- **Time**: 30 seconds to 2 minutes depending on subtitle length
- **Storage**: ~1-5 MB per movie
- **CPU**: High during generation, low during queries

### RAG Queries
- **Latency**: 1-3 seconds per question
- **Accuracy**: Based on subtitle quality and relevance

### WebSocket
- **Concurrent Connections**: Multiple users can query different movies simultaneously
- **Memory**: One connection per active chat session

## Troubleshooting

### Embeddings Not Generating
1. Check if subtitles are available for the movie
2. Verify `data/embeddings/` directory exists
3. Check backend logs for errors

### WebSocket Connection Failed
1. Ensure backend is running
2. Check CORS configuration in `main.py`
3. Verify WebSocket URL format

### Chat Not Responding
1. Check if embeddings exist: `GET /check_embeddings/{movie}`
2. Verify WebSocket connection in browser console
3. Check backend logs for errors

## Future Enhancements

Potential improvements:
- Cache embeddings for popular movies
- Add support for multiple languages
- Implement streaming responses
- Add citation to specific subtitle timestamps
- Support for custom chunk sizes
- Integration with video player for timestamped answers

## Files Modified/Created

### New Files
- `backend_fastapi/src/api/endpoints/embeddings_generation.py`
- `backend_fastapi/src/api/endpoints/websocket_chat.py`
- `backend_fastapi/RAG_IMPLEMENTATION.md` (this file)

### Modified Files
- `backend_fastapi/src/main.py` - Added new routers
- `backend_fastapi/requirements.txt` - Added dependencies
- `backend_fastapi/src/core/rag_chat.py` - Updated to use SentenceTransformer
- `frontend_next/app/deep-dive/[movieId]/page.tsx` - Complete rewrite with WebSocket support

## Testing

### Manual Testing Steps
1. Start backend: `cd backend_fastapi && uvicorn src.main:app --reload`
2. Start frontend: `cd frontend_next && npm run dev`
3. Search for a movie (e.g., "The Matrix")
4. Click "Deep Dive"
5. Wait for embeddings generation
6. Ask questions like:
   - "What is the main plot?"
   - "Who are the main characters?"
   - "What happens at the end?"

### API Testing
```bash
# Check embeddings
curl http://localhost:8000/check_embeddings/The%20Matrix%20(1999)

# Generate embeddings
curl -X POST http://localhost:8000/generate_embeddings \
  -H "Content-Type: application/json" \
  -d '{"movie": "The Matrix (1999)"}'
```

## Notes

- Embeddings are stored permanently and reused across sessions
- First-time users will experience a delay while embeddings generate
- Subtitle quality affects answer accuracy
- The system uses the movie title with year for uniqueness
- WebSocket connections are automatically closed on page navigation
