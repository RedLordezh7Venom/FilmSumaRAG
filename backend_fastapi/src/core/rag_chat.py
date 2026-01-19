import numpy as np
from typing import TypedDict, List, AsyncIterator
from sklearn.metrics.pairwise import cosine_similarity
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage
from src.core.embeddings import load_embeddings, embedder
from src.core.llm_model import llm

class RAGState(TypedDict):
    movie_name: str
    question: str
    chunks: List[str]
    vectors: np.ndarray
    query_vector: np.ndarray
    relevant_chunks: List[str]
    context: str
    answer: str

def load_movie_data(state: RAGState) -> RAGState:
    # load embeddings from disk
    data = load_embeddings(state["movie_name"])
    return {
        **state,
        "chunks": data["chunks"],
        "vectors": np.array(data["vectors"])
    }

def embed_query(state: RAGState) -> RAGState:
    # create embedding for question
    query_vec = embedder.encode([state["question"]], convert_to_tensor=False)[0]
    return {
        **state,
        "query_vector": query_vec
    }

def retrieve_context(state: RAGState) -> RAGState:
    # find top 3 relevant chunks
    sims = cosine_similarity([state["query_vector"]], state["vectors"])[0]
    
    top_idxs = np.argsort(sims)[-3:][::-1]
    relevant_chunks = [state["chunks"][i] for i in top_idxs]
    
    context = "\n\n".join(relevant_chunks)
    
    return {
        **state,
        "relevant_chunks": relevant_chunks,
        "context": context
    }

async def generate_answer(state: RAGState) -> RAGState:
    # generate answer using llm
    prompt = f"""answer the question using the movie context. be specific and reference dialogue when relevant.

context:
{state["context"]}

question: {state["question"]}"""
    
    messages = [HumanMessage(content=prompt)]
    response = await llm.ainvoke(messages)
    
    return {
        **state,
        "answer": response.content
    }

def create_rag_graph():
    # build rag workflow
    workflow = StateGraph(RAGState)
    
    workflow.add_node("load_movie_data", load_movie_data)
    workflow.add_node("embed_query", embed_query)
    workflow.add_node("retrieve_context", retrieve_context)
    workflow.add_node("generate_answer", generate_answer)
    
    workflow.set_entry_point("load_movie_data")
    workflow.add_edge("load_movie_data", "embed_query")
    workflow.add_edge("embed_query", "retrieve_context")
    workflow.add_edge("retrieve_context", "generate_answer")
    workflow.add_edge("generate_answer", END)
    
    return workflow.compile()

async def answer_question(movie_name: str, question: str) -> str:
    # batch mode answer generation
    graph = create_rag_graph()
    
    initial_state = {
        "movie_name": movie_name,
        "question": question,
        "chunks": [],
        "vectors": np.array([]),
        "query_vector": np.array([]),
        "relevant_chunks": [],
        "context": "",
        "answer": ""
    }
    
    result = await graph.ainvoke(initial_state)
    return result["answer"]

async def answer_question_stream(movie_name: str, question: str) -> AsyncIterator[str]:
    # stream answer tokens as generated
    
    # retrieve context first
    data = load_embeddings(movie_name)
    chunks, vectors = data["chunks"], np.array(data["vectors"])
    
    # embed query
    query_vec = embedder.encode([question], convert_to_tensor=False)[0]
    
    # find top 3 chunks
    sims = cosine_similarity([query_vec], vectors)[0]
    top_idxs = np.argsort(sims)[-3:][::-1]
    context = "\n\n".join([chunks[i] for i in top_idxs])
    
    # stream llm response
    prompt = f"""answer the question using the movie context. be specific and reference dialogue when relevant.

context:
{context}

question: {question}"""
    
    messages = [HumanMessage(content=prompt)]
    
    # stream tokens
    async for token in llm.astream(messages):
        if hasattr(token, 'content'):
            yield token.content