import numpy as np
from typing import TypedDict, List, AsyncIterator
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage
from src.core.embeddings import embedder
from src.core import vector_db
from src.core.llm_model import llm

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
    # find top 3 relevant chunks using Vector DB
    relevant_chunks = vector_db.search_movie(
        state["movie_name"], 
        state["query_vector"], 
        n_results=3
    )
    
    context = "\n\n".join(relevant_chunks)
    
    return {
        **state,
        "relevant_chunks": relevant_chunks,
        "context": context
    }

async def generate_answer(state: RAGState) -> RAGState:
    # generate answer using llm
    prompt = f"""You are the ultimate Cinema Deep Dive expert. You have just finished a master-class analysis of the movie "{state['movie_name']}". 
Your goal is to provide profound, engaging, and direct answers to questions about this film using the specific dialogue and scenes provided in the context.

RULES:
- DO NOT say "Based on the context" or "According to the transcript".
- Speak with authority and passion, like a film critic or a dedicated fan who knows every detail.
- Use the provided context to back up your insights, specifically referencing dialogue when it adds flavor.
- If the answer isn't in the context, use your general knowledge of the film but prioritize the specific details provided.
- Keep it punchy, insightful, and cinematic.

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
    
    # retrieve context from Vector DB
    relevant_chunks = vector_db.search_movie(movie_name, query_vec, n_results=3)
    context = "\n\n".join(relevant_chunks)
    
    # stream llm response
    prompt = f"""You are the ultimate Cinema Deep Dive expert. You have just finished a master-class analysis of the movie "{movie_name}". 
Your goal is to provide profound, engaging, and direct answers to questions about this film using the specific dialogue and scenes provided in the context.

RULES:
- DO NOT say "Based on the context" or "According to the transcript".
- Speak with authority and passion, like a film critic or a dedicated fan who knows every detail.
- Use the provided context to back up your insights, specifically referencing dialogue when it adds flavor.
- If the answer isn't in the context, use your general knowledge of the film but prioritize the specific details provided.
- Keep it punchy, insightful, and cinematic.

CONTEXT FROM THE FILM:
{context}

QUESTION: {question}
ANSWER:"""
    
    messages = [HumanMessage(content=prompt)]
    
    # stream tokens
    async for token in llm.astream(messages):
        if hasattr(token, 'content'):
            yield token.content


