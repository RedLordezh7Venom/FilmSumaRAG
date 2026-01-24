import numpy as np
from typing import TypedDict, List, AsyncIterator
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage
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

class RAGState(TypedDict):
    movie_name: str
    question: str
    query_vector: np.ndarray
    relevant_chunks: List[str]
    context: str
    answer: str

def embed_query(state: RAGState) -> RAGState:
    # create embedding for question
    query_vec = embedder.encode([state["question"]], convert_to_tensor=False)[0]
    return {
        **state,
        "query_vector": query_vec
    }

def retrieve_context(state: RAGState) -> RAGState:
    # Use Hybrid Search (Vector + BM25) with k=10
    movie_name = state["movie_name"]
    question = state["question"]
    query_vector = state["query_vector"]
    k = 10

    # 1. Vector Search
    vector_results = vector_db.search_movie(movie_name, query_vector, n_results=k * 2)
    
    # 2. BM25 Search
    all_docs = vector_db.get_movie_documents(movie_name)
    if not all_docs:
        relevant_chunks = vector_results[:k]
    else:
        # Simple tokenization for BM25
        tokenized_corpus = [word_tokenize(doc.lower()) for doc in all_docs]
        bm25 = BM25Okapi(tokenized_corpus)
        tokenized_query = word_tokenize(question.lower())
        bm25_results = bm25.get_top_n(tokenized_query, all_docs, n=k * 2)
        
        # 3. Combine with Reciprocal Rank Fusion (RRF)
        ranks = {}
        for i, doc in enumerate(vector_results):
            ranks[doc] = ranks.get(doc, 0) + 1 / (i + 60)
        for i, doc in enumerate(bm25_results):
            ranks[doc] = ranks.get(doc, 0) + 1 / (i + 60)
            
        sorted_chunks = sorted(ranks.items(), key=lambda x: x[1], reverse=True)
        relevant_chunks = [chunk for chunk, score in sorted_chunks[:k]]

    context = "\n\n".join(relevant_chunks)
    
    return {
        **state,
        "relevant_chunks": relevant_chunks,
        "context": context
    }

async def generate_answer(state: RAGState) -> RAGState:
    # generate answer using llm
    prompt = f"""You are a passionate Cinephile and Film Critic who has just watched "{state['movie_name']}". 
Your goal is to provide profound, engaging, and direct answers to questions about this film using the specific dialogue and scenes provided in the context.

PERSONALITY & STYLE:
- Answer as a dedicated fan who knows every detail. Be enthusiastic, but grounded.
- DO NOT say "Based on the context" or "According to the transcript".
- Speak naturally. Use phrases like "I was moved by...", "It's interesting how...", or "If you look closely at the dialogue...".
- Subtly weave in references to scenes without being robotic.

GROUNDING & CITATIONS:
- After your main response, include a short section titled "🎞️ SCENE EVIDENCE" where you provide 2-3 specific snippets from the transcript that back up your points.
- Format snippets as: > "[Snippet Text]"

CONTEXT FROM THE FILM:
{state["context"]}

QUESTION: {state["question"]}
ANSWER:"""
    
    messages = [HumanMessage(content=prompt)]
    response = await llm.ainvoke(messages)
    
    return {
        **state,
        "answer": response.content
    }

def create_rag_graph():
    # build rag workflow
    workflow = StateGraph(RAGState)
    
    workflow.add_node("embed_query", embed_query)
    workflow.add_node("retrieve_context", retrieve_context)
    workflow.add_node("generate_answer", generate_answer)
    
    workflow.set_entry_point("embed_query")
    workflow.add_edge("embed_query", "retrieve_context")
    workflow.add_edge("retrieve_context", "generate_answer")
    workflow.add_edge("generate_answer", END)
    
    return workflow.compile()

async def answer_question(movie_name: str, question: str) -> str:
    # check existence first
    if not vector_db.has_movie(movie_name):
        raise FileNotFoundError(f"No embeddings found for check {movie_name}")

    # batch mode answer generation
    graph = create_rag_graph()
    
    initial_state = {
        "movie_name": movie_name,
        "question": question,
        "query_vector": np.array([]),
        "relevant_chunks": [],
        "context": "",
        "answer": ""
    }
    
    result = await graph.ainvoke(initial_state)
    return result["answer"]

async def answer_question_stream(movie_name: str, question: str) -> AsyncIterator[str]:
    # stream answer tokens as generated
    
    # check existence first
    if not vector_db.has_movie(movie_name):
        raise FileNotFoundError(f"No embeddings found for {movie_name}")
    
    # embed query
    query_vec = embedder.encode([question], convert_to_tensor=False)[0]
    
    # --- Hybrid Retrieval (Integrated here for streaming) ---
    k = 10
    vector_results = vector_db.search_movie(movie_name, query_vec, n_results=k * 2)
    all_docs = vector_db.get_movie_documents(movie_name)
    
    if not all_docs:
        relevant_chunks = vector_results[:k]
    else:
        tokenized_corpus = [word_tokenize(doc.lower()) for doc in all_docs]
        bm25 = BM25Okapi(tokenized_corpus)
        tokenized_query = word_tokenize(question.lower())
        bm25_results = bm25.get_top_n(tokenized_query, all_docs, n=k * 2)
        
        ranks = {}
        for i, doc in enumerate(vector_results):
            ranks[doc] = ranks.get(doc, 0) + 1 / (i + 60)
        for i, doc in enumerate(bm25_results):
            ranks[doc] = ranks.get(doc, 0) + 1 / (i + 60)
            
        sorted_chunks = sorted(ranks.items(), key=lambda x: x[1], reverse=True)
        relevant_chunks = [chunk for chunk, score in sorted_chunks[:k]]

    context = "\n\n".join(relevant_chunks)
    # ---------------------------------------------------------
    
    # stream llm response
    prompt = f"""You are a passionate Cinephile and Film Critic who has just watched "{movie_name}". 
Your goal is to provide profound, engaging, and direct answers to questions about this film using the specific dialogue and scenes provided in the context.

PERSONALITY & STYLE:
- Answer as a dedicated fan who knows every detail. Be enthusiastic, but grounded.
- DO NOT say "Based on the context" or "According to the transcript".
- Speak naturally. Use phrases like "I was moved by...", "It's interesting how...", or "If you look closely at the dialogue...".
- Subtly weave in references to scenes without being robotic.

GROUNDING & CITATIONS:
- After your main response, include a short section titled "🎞️ SCENE EVIDENCE" where you provide 2-3 specific snippets from the transcript that back up your points.
- Format snippets as: > "[Snippet Text]"

CONTEXT FROM THE FILM:
{context}

QUESTION: {question}
ANSWER:"""
    
    messages = [HumanMessage(content=prompt)]
    
    # stream tokens
    async for token in llm.astream(messages):
        if hasattr(token, 'content'):
            yield token.content


