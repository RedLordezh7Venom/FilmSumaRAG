import numpy as np
import os
import time
from typing import TypedDict, List, AsyncIterator, Annotated, Sequence, Dict, Optional, Union, Any
from langgraph.graph import StateGraph, END, MessagesState
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from src.core.embeddings import embedder
from src.core import vector_db
from src.core.llm_model import llm
from rank_bm25 import BM25Okapi
import nltk
import re
import json

# Download punkt for tokenization
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

from nltk.tokenize import word_tokenize

# Global cache for pre-tokenized corpora (Keyed by tmdb_id)
BM25_CACHE = {}

# Define RAG State
class RAGState(MessagesState):
    tmdb_ids: List[int]
    question: str
    persona: str = "critic"
    relevant_ids: List[str]
    relevant_sources: List[Dict[str, str]] # List of {"id": cid, "text": text}
    context: str

# Persistent Checkpointer Path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "checkpoints.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

async def retrieve_context_node(state: RAGState) -> dict:
    tmdb_ids = state["tmdb_ids"]
    question = state.get("question") or state["messages"][-1].content
    
    query_vector = embedder.encode([question], convert_to_tensor=False)[0]
    k_per_movie = 10 if len(tmdb_ids) == 1 else 6 
    
    all_relevant_chunks = []
    all_relevant_ids = []
    # Explicitly reset sources for the current turn to avoid accumulation from state memory
    current_sources = []
    
    from src.db.database import SessionLocal
    from src.models.sql_models import Feedback, ChatHistory, SummaryCache, SummaryType, Movie
    db = SessionLocal()
    
    from src.utils.logger import logger
    start_time = time.time()
    
    try:
        for tid in tmdb_ids:
            # 1. Fetch movie details for titles and active learning
            movie_record = db.query(Movie).filter(Movie.tmdb_id == tid).first()
            movie_name = movie_record.title if movie_record else f"ID:{tid}"
            
            logger.rag(f"Starting lookup for '{movie_name}' (TMDB:{tid})")
            
            # 2. Vector Search
            v_start = time.time()
            vector_results = vector_db.search_movie(tid, query_vector, n_results=k_per_movie * 2)
            logger.rag(f"Vector search found {len(vector_results)} chunks (Time: {time.time() - v_start:.3f}s)")
            
            # 3. Hybrid / BM25
            bm_start = time.time()
            all_docs_data = vector_db.get_movie_data(tid)
            
            if not all_docs_data:
                all_relevant_chunks.extend([v["text"] for v in vector_results[:k_per_movie]])
                all_relevant_ids.extend([v["id"] for v in vector_results[:k_per_movie]])
                continue

            # Check cache for tokenized corpus (Keyed by tmdb_id)
            tid_key = str(tid)
            if tid_key not in BM25_CACHE:
                logger.rag(f"Tokenizing corpus for {movie_name} (first-time optimization)...")
                BM25_CACHE[tid_key] = [word_tokenize(doc["text"].lower()) for doc in all_docs_data]
            
            tokenized_corpus = BM25_CACHE[tid_key]
            bm25 = BM25Okapi(tokenized_corpus)
            tokenized_query = word_tokenize(question.lower())
            bm25_indices = bm25.get_top_n(tokenized_query, range(len(all_docs_data)), n=k_per_movie * 2)
            bm25_results = [all_docs_data[i] for i in bm25_indices]
            logger.rag(f"BM25 ranker finished in {time.time() - bm_start:.3f}s")
            
            from src.core.active_learning import get_discredited_chunks, apply_penalties
            penalties = get_discredited_chunks(db, movie_record.id) if movie_record else {}
            if penalties:
                logger.active_learning(f"Applying penalties to {len(penalties)} discredited fragments.")

            ranks = {}
            id_to_text = {}
            for i, res in enumerate(vector_results):
                cid, text = res["id"], res["text"]
                id_to_text[cid] = f"[{movie_name}] {text}"
                ranks[cid] = ranks.get(cid, 0) + (1 / (i + 60))
                
            for i, res in enumerate(bm25_results):
                cid, text = res["id"], res["text"]
                id_to_text[cid] = f"[{movie_name}] {text}"
                ranks[cid] = ranks.get(cid, 0) + (1 / (i + 60))

            ranks = apply_penalties(ranks, penalties)
                
            sorted_items = sorted(ranks.items(), key=lambda x: x[1], reverse=True)
            top_items = sorted_items[:k_per_movie]
            
            all_relevant_chunks.extend([id_to_text[cid] for cid, score in top_items])
            all_relevant_ids.extend([cid for cid, score in top_items])
            
            for cid, score in top_items:
                current_sources.append({
                    "id": cid,
                    "text": id_to_text[cid]
                })

            if movie_record:
                research_summary = db.query(SummaryCache).filter(
                    SummaryCache.movie_id == movie_record.id,
                    SummaryCache.summary_type == "video_essay"
                ).first()
                if research_summary:
                    logger.rag(f"Injecting external research dossier for {movie_name}")
                    all_relevant_chunks.append(f"\n--- EXTERNAL RESEARCH: {movie_name} ---\n{research_summary.content}")
    finally:
        db.close()

    logger.rag(f"Context assembly complete. Total retrieval time: {time.time() - start_time:.3f}s")
    return {
        "context": "\n\n".join(all_relevant_chunks),
        "relevant_ids": all_relevant_ids,
        "relevant_sources": current_sources
    }

from langchain_core.runnables import RunnableConfig

async def generate_answer_node(state: RAGState, config: RunnableConfig) -> dict:
    from src.utils.logger import logger
    persona = state.get("persona", "critic")
    tmdb_ids = state["tmdb_ids"]
    context = state["context"]
    question = state.get("question") or state["messages"][-1].content
    
    from src.db.database import SessionLocal
    from src.models.sql_models import Movie
    db = SessionLocal()
    titles = []
    for tid in tmdb_ids:
        m = db.query(Movie).filter(Movie.tmdb_id == tid).first()
        titles.append(m.title if m else str(tid))
    db.close()
    
    display_title = " vs ".join(titles)
    from src.agents.persona_agents import PersonaManager
    prompt_content = PersonaManager.get_persona_prompt(persona, display_title, context)
    
    messages = [
        PersonaManager.get_system_message(persona),
        HumanMessage(content=f"{prompt_content}\n\nQUESTION: {question}\nANSWER:")
    ]
    
    gen_start = time.time()
    logger.agent(f"Generating {persona.upper()} response for '{display_title}'...")
    # Use astream so each token fires on_chat_model_stream in astream_events
    full_content = ""
    async for chunk in llm.astream(messages, config):
        if chunk.content:
            full_content += chunk.content
    logger.agent(f"Generation finished in {time.time() - gen_start:.3f}s")
    return {"messages": [AIMessage(content=full_content)]}

def create_rag_graph(checkpointer=None):
    workflow = StateGraph(RAGState)
    workflow.add_node("retrieve", retrieve_context_node)
    workflow.add_node("generate", generate_answer_node)
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("generate", END)
    return workflow.compile(checkpointer=checkpointer)

async def answer_question_stream(tmdb_id: Union[int, List[int]], question: str, persona: str = "critic", thread_id: str = "default") -> AsyncIterator[dict]:
    tmdb_ids = [tmdb_id] if isinstance(tmdb_id, int) else tmdb_id
    for tid in tmdb_ids:
        if not vector_db.has_movie(tid):
            raise FileNotFoundError(f"Embeddings not ready for Movie (ID: {tid}). Please navigate to its page and generate a summary first.")
    
    async with AsyncSqliteSaver.from_conn_string(DB_PATH) as memory:
        await memory.setup()
        graph = create_rag_graph(memory)
        config = {"configurable": {"thread_id": thread_id}}
        
        initial_input = {
            "tmdb_ids": tmdb_ids,
            "question": question,
            "persona": persona,
            "messages": [HumanMessage(content=question)]
        }

        async for event in graph.astream_events(initial_input, config=config, version="v2"):
            kind = event["event"]
            
            if kind == "on_chain_end" and event.get("name") == "retrieve":
                output = event["data"].get("output")
                if output and "relevant_sources" in output:
                    yield {"type": "citations", "sources": output["relevant_sources"]}
            
            if kind == "on_chat_model_stream":
                token = event["data"]["chunk"].content
                if token:
                    yield {"type": "token", "token": token}
                    
    yield {"type": "done"}
