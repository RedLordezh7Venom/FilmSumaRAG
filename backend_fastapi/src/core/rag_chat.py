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
    
    from src.db.database import SessionLocal
    from src.models.sql_models import Feedback, ChatHistory, SummaryCache, SummaryType, Movie
    db = SessionLocal()
    
    start_time = time.time()
    
    try:
        for tid in tmdb_ids:
            # 1. Fetch movie details for titles and active learning
            movie_record = db.query(Movie).filter(Movie.tmdb_id == tid).first()
            movie_name = movie_record.title if movie_record else f"ID:{tid}"
            
            print(f"[RAG] Retrieving context for {movie_name}...")
            
            # 2. Vector Search
            v_start = time.time()
            vector_results = vector_db.search_movie(tid, query_vector, n_results=k_per_movie * 2)
            print(f"[RAG] Vector search took {time.time() - v_start:.3f}s")
            
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
                print(f"[RAG] Tokenizing corpus for {movie_name} (first time)...")
                BM25_CACHE[tid_key] = [word_tokenize(doc["text"].lower()) for doc in all_docs_data]
            
            tokenized_corpus = BM25_CACHE[tid_key]
            bm25 = BM25Okapi(tokenized_corpus)
            tokenized_query = word_tokenize(question.lower())
            bm25_indices = bm25.get_top_n(tokenized_query, range(len(all_docs_data)), n=k_per_movie * 2)
            bm25_results = [all_docs_data[i] for i in bm25_indices]
            print(f"[RAG] BM25 calculation took {time.time() - bm_start:.3f}s")
            
            from src.core.active_learning import get_discredited_chunks, apply_penalties
            penalties = get_discredited_chunks(db, movie_record.id) if movie_record else {}

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

            if movie_record:
                research_summary = db.query(SummaryCache).filter(
                    SummaryCache.movie_id == movie_record.id,
                    SummaryCache.summary_type == SummaryType.VIDEO_ESSAY
                ).first()
                if research_summary:
                    all_relevant_chunks.append(f"\n--- EXTERNAL RESEARCH: {movie_name} ---\n{research_summary.content}")
    finally:
        db.close()

    print(f"[RAG] Total retrieval node execution: {time.time() - start_time:.3f}s")
    return {
        "context": "\n\n".join(all_relevant_chunks),
        "relevant_ids": all_relevant_ids
    }

async def generate_answer_node(state: RAGState) -> dict:
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
    
    print(f"[RAG] Starting LLM generation for persona: {persona}")
    response = await llm.ainvoke(messages)
    return {"messages": [response]}

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
                if output and "relevant_ids" in output:
                    yield {"type": "citations", "ids": output["relevant_ids"]}
            
            if kind == "on_chat_model_stream":
                token = event["data"]["chunk"].content
                if token:
                    yield {"type": "token", "token": token}
                    
    yield {"type": "done"}
