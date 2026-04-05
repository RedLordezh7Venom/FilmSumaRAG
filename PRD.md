# Product Requirements Document (PRD): FilmSumaRAG

## 1. Project Overview
FilmSumaRAG is a modern, interactive web application that serves as a community hub and deep-dive exploration platform for film enthusiasts. It bridges the gap between passive movie consumption and active discussion by providing AI-generated insights, summaries, and notebook-style RAG-based interactive "Deep Dives" into movies. It focuses on a modern web design (Web 2.0/3.0 aesthetic) over a traditional forum look.

## 2. Target Audience & Use Case
**Target Audience:** Film enthusiasts (similar to Letterboxd users) who want more than just ratings—those who seek full explanations, deep dives, video essays, and community discussions without needing to crawl through YouTube or Reddit individually.
**Use Case:** A user logs in, browses movies or discussions, picks a movie, reads AI-curated summaries/insights, or uses the interactive "Deep Dive" chatbot to dissect specific scenes, philosophies, or plot points. Finally, they can engage in the community.

## 3. Core Features

### 3.1 Authentication & User Management
- **Login/Signup:** Reliable, highly accessible authentication utilizing an easy-to-integrate, modern framework suitable for rapid development (e.g., NextAuth.js / Auth.js, Clerk, or Supabase Auth).
- **User Side Pane:** A hover-based sidebar (similar to ChatGPT's interface) containing a user's recent "Deep Dives" and chats.

### 3.2 Homepage & Navigation
- **Browse Movies:** A responsive catalog view of films available for exploration.
- **Browse Discussions:** A centralized community feed where users can see ongoing discussions about various movies.

### 3.3 Movie Dashboard (Two Modes)
When a user navigates to a specific movie, they are presented with two primary modes:
1. **Summary Mode:** Static, highly-curated data consisting of AI-generated plot summaries, links to video essays, and general discussions. All generated content to be stored efficiently to minimize redundant AI calls.
2. **Deep Dive Mode (Interactive RAG):** A NotebookLM-style interactive chat interface where users can query the movie's subtitiles and metadata. 

### 3.4 Community & Feedback Loop
- **Discussions:** Users can discuss the film, its deep-dives, and summaries.
- **Feedback Mechanism:** Users can provide feedback on the AI-generated plots and answers, which will feed back into the RAG model to improve future vector retrievals and generations.

### 3.5 AI & Agentic Capabilities
- **Multi-Agent Deep Dives:** Specialized AI agents to handle diverse topics:
  - *The Philosopher Agent:* Explores overarching themes and existential concepts.
  - *The Cinematographer/Scene Creation Agent:* Analyzes visual storytelling and scene structures.
- **Video Essay & Content Crawling:** Use multi-agent setups (potentially utilizing Perplexity-style workflows) to surface existing high-quality video essays and critiques.

## 4. Technical Architecture & Data Storage

The infrastructure must be exceptionally lightweight for a local development environment (targeted to run on an 8GB RAM laptop), while maintaining an architecture that allows for "plug-and-play" scalability later.

### 4.1 Frontend
- **Framework:** Next.js (indicated by the `frontend_next` setup).
- **Styling:** Tailwind CSS / standard CSS (modern, non-sloppy UI).

### 4.2 Backend
- **Framework:** FastAPI / Python (lightweight, highly concurrent for local dev, easily scalable).
- **Authentication:** NextAuth / lightweight JWT based implementation.

### 4.3 Database & Storage
- **Relational Database (PostgreSQL):**
  - **Chats:** Store per-user chats using LangGraph UUIDs.
  - **Movie Summaries:** Store AI-generated summaries tied to movie IDs to prevent redundant AI generation.
  - *Recommendation:* SQLite for immediate local dev if PostgreSQL is too heavy, but PostgreSQL is highly preferred (via Docker) to mimic production.
- **Vector Database:**
  - Store movie subtitles and transcripts as embeddings. Segregated or partitioned *per movie*.
  - *Recommendation:* ChromaDB, Qdrant, or FAISS configured for local, low-memory usage, easily swapped out for Pinecone/Milvus in production.

## 5. Development Strategy (Multi-Agent Workflow)
To facilitate rapid development across a multi-component RAG architecture, development will be split across multiple Antigravity AI agents:
1. **Frontend / UI Agent:** Focuses strictly on Next.js, Auth integration, the sidebar layout, and general modern styling.
2. **Backend & DB Agent:** Handles FastAPI endpoints, PostgreSQL schemas, storage of movie summaries, and chat history.
3. **RAG & Vector DB Agent:** Focuses strictly on subtitle injestion, chunking, embedding, vector database management, and LangGraph UUID setups.
4. **Agentic Workflow / Content Crawler Agent:** Responsible for the specialized AI personas (Philosopher, Scene Creator) and researching/crawling YouTube/Perplexity flows for video essays.

## 6. Future Enhancements & Scaling
- Offload Vector DB to a managed cloud provider.
- Transition PostgreSQL to a managed cluster (AWS RDS / Supabase).
- Move from local LLMs/cheap APIs to heavier, highly capable models based on user feedback loops.
- Expand community features to web3 elements if community demands, though maintaining a Web 2.0 modern standard is the primary directive.
