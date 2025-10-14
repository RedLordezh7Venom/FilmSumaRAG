from src.core.embeddings import load_embeddings, embedder
from sklearn.metrics.pairwise import cosine_similarity
from src.core.llm_model import llm
from langchain.prompts import PromptTemplate
import numpy as np

async def answer_question(movie_name: str, question: str):
    """
    Answer a question about a movie using RAG
    """
    # Load embeddings
    data = load_embeddings(movie_name)
    chunks, vectors = data["chunks"], np.array(data["vectors"])

    # Embed the question using the same embedder
    q_vec = embedder.encode([question], convert_to_tensor=False)[0]
    
    # Find top 3 relevant chunks
    sims = cosine_similarity([q_vec], vectors)[0]
    top_idxs = np.argsort(sims)[-3:][::-1]
    context = "\n\n".join([chunks[i] for i in top_idxs])

    # Create prompt
    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template="""You are a movie analyst AI assistant. Using the following movie dialogue and context, answer the question conversationally and accurately.

Context from movie:
{context}

Question: {question}

Answer the question based on the context provided. Be specific and reference the dialogue when relevant. If the context doesn't contain enough information to answer fully, say so."""
    )
    
    final_prompt = prompt.format(context=context, question=question)
    response = await llm.ainvoke(final_prompt)
    return response.content
