# Local "No-Docker" Production-Like Architecture Plan

Since we cannot use Docker containers, we will build a robust "Native" local development environment. This matches a production architecture logic-wise but uses tools compatible with Windows and local python processes.

## 1. The Stack Selection

| Component | Production (Cloud) | Local Native (No Docker) | Library / Tool |
|-----------|--------------------|--------------------------|----------------|
| **Vector DB** | Pincone / Chroma Server | **ChromaDB (Persistent)** | `pip install chromadb` |
| **Relational DB** | PostgreSQL (Supabase) | **PostgreSQL (Windows)** or **SQLite** | `pip install sqlalchemy` |
| **Queue/Cache** | Redis (Upstash) | **Memurai** (Redis for Windows) or **In-Process** | `pip install redis celery` |

### Strategy
1.  **Vector Database**: We will replace `.pkl` files with **ChromaDB**. In local mode, Chroma saves to a `./chroma_db` folder but behaves exactly like a server. This solves the "scale" and "search" issues.
2.  **Relational Database**: We will use **SQLAlchemy** (ORM). 
    *   *Recommendation*: Start with **SQLite** (`filmsuma.db`) for local dev. It requires **zero installation** and works perfectly with SQLAlchemy. When you go to production, you just change the connection string to PostgreSQL.
3.  **Task Queue**: Running Redis on Windows natively is tricky. 
    *   *Option A (Recommended for simplicity)*: Stick to `FastAPI.BackgroundTasks` for now. It works well for single-server setups. 
    *   *Option B (True Production Sim)*: Install **Memurai** (Redis for Windows) and set up **Celery**. This is complex to configure on Windows.
    *   *Decision*: We will implement **ChromaDB** and **SQLAlchemy (SQLite)** first. We will keep `BackgroundTasks` but refactor the code so it's ready for Celery later.

## 2. Implementation Steps

### Phase 1: Vector Database (ChromaDB)
Instead of saving `movie_name.pkl`, we will upsert vectors into a Chroma collection.
- **Action**: Install `chromadb`.
- **Action**: Rewrite `src/core/embeddings.py` to initialize a Chroma Client.
- **Action**: Create `add_movie_vectors` and `query_similar_dialogue` functions.

### Phase 2: Metadata Database (SQLAlchemy + SQLite)
We need to track if a movie is "processed", "pending", or "failed".
- **Action**: Install `sqlalchemy`.
- **Action**: Create `src/db/database.py` for connection logic.
- **Action**: Create `src/models/sql_models.py` (Movie, JobStatus tables).
- **Action**: Update endpoints to check this DB before starting work.

## 3. Immediate Next Step
I will start by installing the necessary libraries and refactoring the **Embeddings** system to use ChromaDB. This yields the biggest immediate benefit (searchability).
