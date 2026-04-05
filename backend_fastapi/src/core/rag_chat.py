import numpy as np
import os
import sqlite3
from typing import TypedDict, List, AsyncIterator, Annotated, Sequence
from langgraph.graph import StateGraph, END, MessagesState
from langgraph.checkpoint.sqlite import SqliteSaver
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from src.core.embeddings import embedder
from src.core import vector_db
from src.core.llm_model import llm
from rank_bm25 import BM25Okapi
import nltk
import re

# Download punkt for tokenization
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

from nltk.tokenize import word_tokenize

import json
from typing import List, Dict, Optional, AsyncIterator, Union

# Define RAG State with Messages history
class RAGState(MessagesState):
    movie_names: List[str] # Now supports multiple movies
    question: str
    query_vector: np.ndarray
    relevant_chunks: List[str]
    relevant_ids: List[str] 
    context: str
    answer: str
    persona: str = "critic"

# Persistent Checkpointer
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "checkpoints.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
memory = SqliteSaver.from_conn_string(DB_PATH)

def embed_query(state: RAGState) -> dict:
    # create embedding for question (use last message if question is not set)
    question = state.get("question") or state["messages"][-1].content
    query_vec = embedder.encode([question], convert_to_tensor=False)[0]
    return {
        "query_vector": query_vec,
        "question": question
    }

def retrieve_context(state: RAGState) -> dict:
    # Use Hybrid Search (Vector + BM25) for multiple movies if needed
    movie_names = state["movie_names"]
    question = state["question"]
    query_vector = state["query_vector"]
    k_per_movie = 10 if len(movie_names) == 1 else 6 # Reduce per-movie if comparing to save tokens
    
    all_relevant_chunks = []
    all_relevant_ids = []
    
    from src.db.database import SessionLocal
    from src.models.sql_models import Feedback, ChatHistory, SummaryCache, SummaryType, Movie
    db = SessionLocal()
    
    try:
        for movie_name in movie_names:
            # 1. Vector Search
            vector_results = vector_db.search_movie(movie_name, query_vector, n_results=k_per_movie * 2)
            
            # 2. BM25 Search
            all_docs_data = vector_db.get_movie_data(movie_name)
            if not all_docs_data:
                all_relevant_chunks.extend([v["text"] for v in vector_results[:k_per_movie]])
                all_relevant_ids.extend([v["id"] for v in vector_results[:k_per_movie]])
                continue

            tokenized_corpus = [word_tokenize(doc["text"].lower()) for doc in all_docs_data]
            bm25 = BM25Okapi(tokenized_corpus)
            tokenized_query = word_tokenize(question.lower())
            bm25_indices = bm25.get_top_n(tokenized_query, range(len(all_docs_data)), n=k_per_movie * 2)
            bm25_results = [all_docs_data[i] for i in bm25_indices]
            
            # 3. Active Learning Penalties
            discredited_ids = {}
            bad_feedback = db.query(Feedback).filter(Feedback.rating <= 2).all()
            for fb in bad_feedback:
                if fb.chat_id:
                    chat = db.query(ChatHistory).filter(ChatHistory.id == fb.chat_id).first()
                    if chat and chat.citations:
                        citations = json.loads(chat.citations)
                        for cid in citations:
                            discredited_ids[cid] = discredited_ids.get(cid, 0) + 1

            # 4. Hybrid Ranking (RRF)
            ranks = {}
            id_to_text = {}
            for i, res in enumerate(vector_results):
                cid, text = res["id"], res["text"]
                id_to_text[cid] = f"[{movie_name}] {text}" # Label with movie name for comparison context
                penalty = discredited_ids.get(cid, 0) * 0.1
                ranks[cid] = ranks.get(cid, 0) + (1 / (i + 60)) - penalty
            for i, res in enumerate(bm25_results):
                cid, text = res["id"], res["text"]
                id_to_text[cid] = f"[{movie_name}] {text}"
                penalty = discredited_ids.get(cid, 0) * 0.1
                ranks[cid] = ranks.get(cid, 0) + (1 / (i + 60)) - penalty
                
            sorted_items = sorted(ranks.items(), key=lambda x: x[1], reverse=True)
            top_items = sorted_items[:k_per_movie]
            
            all_relevant_chunks.extend([id_to_text[cid] for cid, score in top_items])
            all_relevant_ids.extend([cid for cid, score in top_items])

            # 5. External Research
            movie_record = db.query(Movie).filter(Movie.title == movie_name).first()
            if movie_record:
                research_summary = db.query(SummaryCache).filter(
                    SummaryCache.movie_id == movie_record.id,
                    SummaryCache.summary_type == SummaryType.VIDEO_ESSAY
                ).first()
                if research_summary:
                    all_relevant_chunks.append(f"\n--- EXTERNAL RESEARCH: {movie_name} ---\n{research_summary.content}")

    finally:
        db.close()

    context = "\n\n".join(all_relevant_chunks)
    return {
        "relevant_chunks": all_relevant_chunks,
        "relevant_ids": all_relevant_ids,
        "context": context
    }

async def generate_answer(state: RAGState) -> dict:
    from src.agents.persona_agents import PersonaManager
    
    persona = state.get("persona", "critic")
    display_title = " vs ".join(state['movie_names'])
    prompt_content = PersonaManager.get_persona_prompt(persona, display_title, state["context"])
    
    messages = [
        PersonaManager.get_system_message(persona),
        HumanMessage(content=f"{prompt_content}\n\nQUESTION: {state['question']}\nANSWER:")
    ]
    
    response = await llm.ainvoke(messages)
    return {
        "messages": [AIMessage(content=response.content)],
        "answer": response.content
    }

def verify_citations(state: RAGState) -> dict:
    # check if citations in the answer actually exist in the retrieved context
    answer = state.get("answer", "")
    context = state.get("context", "")
    
    if "🎞️ SCENE EVIDENCE" not in answer: return {}
    snippets = re.findall(r'> "(.*?)"', answer)
    if not snippets: return {}
    
    verified_snippets = []
    clean_context = context.lower().replace("\n", " ")
    
    for snippet in snippets:
        if snippet.lower().strip() in clean_context:
            verified_snippets.append(snippet)
            
    evidence_text = "\n\n🎞️ SCENE EVIDENCE\n"
    if verified_snippets:
        for s in verified_snippets: evidence_text += f'> "{s}"\n'
    else:
        evidence_text += "*No verifiable snippets found in transcripts for comparison.*\n"

    new_answer = re.split(r'🎞️ SCENE EVIDENCE', answer)[0] + evidence_text.strip()
    return {
        "answer": new_answer,
        "messages": [AIMessage(content=new_answer)] 
    }

def create_rag_graph():
    workflow = StateGraph(RAGState)
    workflow.add_node("embed_query", embed_query)
    workflow.add_node("retrieve_context", retrieve_context)
    workflow.add_node("generate_answer", generate_answer)
    workflow.add_node("verify_citations", verify_citations)
    workflow.set_entry_point("embed_query")
    workflow.add_edge("embed_query", "retrieve_context")
    workflow.add_edge("retrieve_context", "generate_answer")
    workflow.add_edge("generate_answer", "verify_citations")
    workflow.add_edge("verify_citations", END)
    return workflow.compile(checkpointer=memory)

async def answer_question(movie_name: Union[str, List[str]], question: str, thread_id: str = "default") -> dict:
    # Ensure movie_name is list
    movie_names = [movie_name] if isinstance(movie_name, str) else movie_name
    
    # check existence
    for m in movie_names:
        if not vector_db.has_movie(m):
            raise FileNotFoundError(f"No embeddings found for {m}")

    graph = create_rag_graph()
    config = {"configurable": {"thread_id": thread_id}}
    initial_state = {
        "movie_names": movie_names,
        "question": question,
        "messages": [HumanMessage(content=question)]
    }
    result = await graph.ainvoke(initial_state, config=config)
    return {
        "answer": result["answer"],
        "citations": result.get("relevant_ids", [])
    }

async def answer_question_stream(movie_name: Union[str, List[str]], question: str, persona: str = "critic", thread_id: str = "default") -> AsyncIterator[dict]:
    from src.agents.persona_agents import PersonaManager
    movie_names = [movie_name] if isinstance(movie_name, str) else movie_name
    
    for m in movie_names:
        if not vector_db.has_movie(m):
            raise FileNotFoundError(f"No embeddings found for {m}")
    
    graph = create_rag_graph()
    config = {"configurable": {"thread_id": thread_id}}
    current_state = await graph.aget_state(config)
    history = current_state.values.get("messages", []) if current_state.values else []
    
    retrieval_state = {
        "movie_names": movie_names,
        "question": question,
        "query_vector": embedder.encode([question], convert_to_tensor=False)[0]
    }
    retrieval_data = retrieve_context(retrieval_state)
    context = retrieval_data["context"]
    relevant_ids = retrieval_data["relevant_ids"]
    
    yield {"type": "citations", "ids": relevant_ids}

    display_title = " vs ".join(movie_names)
    prompt_content = PersonaManager.get_persona_prompt(persona, display_title, context)
    
    messages = history + [
        PersonaManager.get_system_message(persona),
        HumanMessage(content=f"{prompt_content}\n\nQUESTION: {question}\nANSWER:")
    ]
    
    full_response = ""
    async for token in llm.astream(messages):
        if hasattr(token, 'content'):
            full_response += token.content
            yield {"type": "token", "token": token.content}
            
    new_messages = [HumanMessage(content=question), AIMessage(content=full_response)]
    await graph.aupdate_state(config, {"messages": new_messages, "movie_names": movie_names, "persona": persona, "relevant_ids": relevant_ids})



