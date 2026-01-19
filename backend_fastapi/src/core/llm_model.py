import os
from typing import TypedDict, List, AsyncIterator
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage

load_dotenv()

llm = ChatGroq(
    model='llama-3.1-8b-instant',
    api_key=os.getenv('GROQ_KEY'),
    temperature=0.6,
    streaming=True,
)

class SummaryState(TypedDict):
    text: str
    chunks: List[str]
    summaries: List[str]
    final_summary: str
    current_chunk_index: int

def chunk_text_for_summary(text: str) -> List[str]:
    # split text into percentage-based chunks
    percentage = 20
    chunk_size = max(1, int(len(text) * percentage / 100))
    chunk_overlap = max(0, int(len(text) * percentage * 0.001))
    
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - chunk_overlap
    
    return chunks

def prepare_chunks(state: SummaryState) -> SummaryState:
    # split text and initialize state
    chunks = chunk_text_for_summary(state["text"])
    return {
        **state,
        "chunks": chunks,
        "summaries": [],
        "current_chunk_index": 0
    }

def should_continue_summarizing(state: SummaryState) -> str:
    # check if more chunks to process
    if state["current_chunk_index"] < len(state["chunks"]):
        return "summarize_chunk"
    return "combine_summaries"

async def summarize_chunk(state: SummaryState) -> SummaryState:
    # summarize current chunk
    chunk_idx = state["current_chunk_index"]
    chunk = state["chunks"][chunk_idx]
    
    prompt = f"""narrate this movie part as an expert narrator. keep it natural and seamless. only return the summary.

{chunk}"""
    
    messages = [HumanMessage(content=prompt)]
    response = await llm.ainvoke(messages)
    
    summaries = state["summaries"] + [response.content]
    
    return {
        **state,
        "summaries": summaries,
        "current_chunk_index": chunk_idx + 1
    }

def combine_summaries(state: SummaryState) -> SummaryState:
    # join all summaries
    final_summary = ' '.join(state["summaries"])
    return {
        **state,
        "final_summary": final_summary
    }

def create_summary_graph():
    # build summarization workflow
    workflow = StateGraph(SummaryState)
    
    workflow.add_node("prepare_chunks", prepare_chunks)
    workflow.add_node("summarize_chunk", summarize_chunk)
    workflow.add_node("combine_summaries", combine_summaries)
    
    workflow.set_entry_point("prepare_chunks")
    workflow.add_conditional_edges("prepare_chunks", should_continue_summarizing)
    workflow.add_conditional_edges("summarize_chunk", should_continue_summarizing)
    workflow.add_edge("combine_summaries", END)
    
    return workflow.compile()

async def generate_summary(text: str) -> str:
    # batch mode summary generation
    print(f"Text length: {len(text)}")
    
    graph = create_summary_graph()
    
    initial_state = {
        "text": text,
        "chunks": [],
        "summaries": [],
        "final_summary": "",
        "current_chunk_index": 0
    }
    
    result = await graph.ainvoke(initial_state)
    return result["final_summary"]

async def generate_summary_stream(text: str) -> AsyncIterator[str]:
    # stream summary tokens as generated
    print(f"streaming text length: {len(text)}")
    chunks = chunk_text_for_summary(text)
    
    for i, chunk in enumerate(chunks):
        prompt = f"""narrate this movie part as an expert narrator. keep it natural and seamless. only return the summary.

{chunk}"""
        
        messages = [HumanMessage(content=prompt)]
        
        # stream tokens from llm
        async for token in llm.astream(messages):
            if hasattr(token, 'content'):
                yield token.content
        
        # space between chunks
        if i < len(chunks) - 1:
            yield " "