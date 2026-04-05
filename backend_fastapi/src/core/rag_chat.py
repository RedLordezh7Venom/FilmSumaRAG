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
# Define RAG State with Messages history
class RAGState(MessagesState):
    movie_name: str
    question: str
    query_vector: np.ndarray
    relevant_chunks: List[str]
    relevant_ids: List[str] # IDs of chunks retrieved
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
    # Use Hybrid Search (Vector + BM25) with k=10
    movie_name = state["movie_name"]
    question = state["question"]
    query_vector = state["query_vector"]
    k = 10

    # 1. Vector Search (now returns {'id', 'text'})
    vector_results = vector_db.search_movie(movie_name, query_vector, n_results=k * 2)
    
    # 2. BM25 Search
    all_docs_data = vector_db.get_movie_data(movie_name)
    if not all_docs_data:
        relevant_chunks = [v["text"] for v in vector_results[:k]]
        relevant_ids = [v["id"] for v in vector_results[:k]]
    else:
        # Simple tokenization for BM25
        tokenized_corpus = [word_tokenize(doc["text"].lower()) for doc in all_docs_data]
        bm25 = BM25Okapi(tokenized_corpus)
        tokenized_query = word_tokenize(question.lower())
        bm25_indices = bm25.get_top_n(tokenized_query, range(len(all_docs_data)), n=k * 2)
        bm25_results = [all_docs_data[i] for i in bm25_indices]
        
        # 3. Active Learning: Get discredited chunks from feedback
        # This part requires a DB session (imported inside for safety in multiple contexts)
        from src.db.database import SessionLocal
        from src.models.sql_models import Feedback, ChatHistory
        
        discredited_ids = {} # map chunk_id -> penalty
        db = SessionLocal()
        try:
            # Find feedback with poor ratings for this movie
            bad_feedback = db.query(Feedback).filter(Feedback.rating <= 2).all()
            for fb in bad_feedback:
                if fb.chat_id:
                    chat = db.query(ChatHistory).filter(ChatHistory.id == fb.chat_id).first()
                    if chat and chat.citations:
                        citations = json.loads(chat.citations)
                        for cid in citations:
                            discredited_ids[cid] = discredited_ids.get(cid, 0) + 1
        finally:
            db.close()

        # 4. Combine with Reciprocal Rank Fusion (RRF)
        # We store score by ID and remember the text
        ranks = {} # chunk_id -> score
        id_to_text = {}
        
        for i, res in enumerate(vector_results):
            cid, text = res["id"], res["text"]
            id_to_text[cid] = text
            penalty = discredited_ids.get(cid, 0) * 0.1 # subtract 0.1 for every bad feedback
            ranks[cid] = ranks.get(cid, 0) + (1 / (i + 60)) - penalty
            
        for i, res in enumerate(bm25_results):
            cid, text = res["id"], res["text"]
            id_to_text[cid] = text
            penalty = discredited_ids.get(cid, 0) * 0.1
            ranks[cid] = ranks.get(cid, 0) + (1 / (i + 60)) - penalty
            
        sorted_items = sorted(ranks.items(), key=lambda x: x[1], reverse=True)
        top_items = sorted_items[:k]
        
        relevant_chunks = [id_to_text[cid] for cid, score in top_items]
        relevant_ids = [cid for cid, score in top_items]

    context = "\n\n".join(relevant_chunks)
    
    return {
        "relevant_chunks": relevant_chunks,
        "relevant_ids": relevant_ids,
        "context": context
    }

async def generate_answer(state: RAGState) -> dict:
    from src.agents.persona_agents import PersonaManager
    
    persona = state.get("persona", "critic")
    prompt_content = PersonaManager.get_persona_prompt(persona, state['movie_name'], state["context"])
    
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
    
    if "🎞️ SCENE EVIDENCE" not in answer:
        return {}

    # extract snippets using regex
    # Format: > "[Snippet Text]"
    snippets = re.findall(r'> "(.*?)"', answer)
    if not snippets:
        return {}
    
    verified_snippets = []
    hallucinated_snippets = []
    
    # Simple fuzzy check (check if snippet substring exists in context)
    # We clean the text for a more robust match
    clean_context = context.lower().replace("\n", " ")
    
    for snippet in snippets:
        clean_snippet = snippet.lower().strip()
        if clean_snippet in clean_context:
            verified_snippets.append(snippet)
        else:
            hallucinated_snippets.append(snippet)
            
    if not hallucinated_snippets:
        return {}
        
    # Reconstruct the "SCENE EVIDENCE" section with only verified snippets
    # If no snippets are left, remove the section or add a warning
    evidence_text = "\n\n🎞️ SCENE EVIDENCE\n"
    if verified_snippets:
        for s in verified_snippets:
            evidence_text += f'> "{s}"\n'
    else:
        evidence_text += "*No verifiable snippets found in transcript for this point.*\n"

    # replace old evidence section with verified one
    new_answer = re.split(r'🎞️ SCENE EVIDENCE', answer)[0] + evidence_text.strip()
    
    return {
        "answer": new_answer,
        "messages": [AIMessage(content=new_answer)] # update history too
    }

def create_rag_graph():
    # build rag workflow
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

async def answer_question(movie_name: str, question: str, thread_id: str = "default") -> dict:
    # check existence first
    if not vector_db.has_movie(movie_name):
        raise FileNotFoundError(f"No embeddings found for {movie_name}")

    graph = create_rag_graph()
    
    config = {"configurable": {"thread_id": thread_id}}
    
    initial_state = {
        "movie_name": movie_name,
        "question": question,
        "messages": [HumanMessage(content=question)]
    }
    
    result = await graph.ainvoke(initial_state, config=config)
    return {
        "answer": result["answer"],
        "citations": result.get("relevant_ids", [])
    }

async def answer_question_stream(movie_name: str, question: str, persona: str = "critic", thread_id: str = "default") -> AsyncIterator[dict]:
    # stream answer tokens as generated while maintaining history
    from src.agents.persona_agents import PersonaManager
    
    if not vector_db.has_movie(movie_name):
        raise FileNotFoundError(f"No embeddings found for {movie_name}")
    
    graph = create_rag_graph()
    config = {"configurable": {"thread_id": thread_id}}
    
    # Get current state from checkpoint to maintain history
    current_state = await graph.aget_state(config)
    history = current_state.values.get("messages", []) if current_state.values else []
    
    # --- Perform Retrieval (Manual for stream convenience) ---
    # Wrap in same logic as retrieve_context for consistency
    state = {
        "movie_name": movie_name,
        "question": question,
        "query_vector": embedder.encode([question], convert_to_tensor=False)[0]
    }
    retrieval_data = retrieve_context(state)
    context = retrieval_data["context"]
    relevant_ids = retrieval_data["relevant_ids"]
    
    # yield citations first to the UI
    yield {"type": "citations", "ids": relevant_ids}

    # Preparation for streaming with persona
    prompt_content = PersonaManager.get_persona_prompt(persona, movie_name, context)
    
    messages = history + [
        PersonaManager.get_system_message(persona),
        HumanMessage(content=f"{prompt_content}\n\nQUESTION: {question}\nANSWER:")
    ]
    
    full_response = ""
    async for token in llm.astream(messages):
        if hasattr(token, 'content'):
            full_response += token.content
            yield {"type": "token", "token": token.content}
            
    # Update the checkpoint manually since we bypassed the graph for streaming
    new_messages = [HumanMessage(content=question), AIMessage(content=full_response)]
    await graph.aupdate_state(config, {"messages": new_messages, "movie_name": movie_name, "persona": persona, "relevant_ids": relevant_ids})



