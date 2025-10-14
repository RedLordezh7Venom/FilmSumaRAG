from src.core.embeddings import load_embeddings
from sklearn.metrics.pairwise import cosine_similarity
from src.core.llm_model import llm
from langchain.prompts import PromptTemplate
import numpy as np

async def answer_question(movie_name: str, question: str):
    data = load_embeddings(movie_name)
    chunks, vectors = data["chunks"], np.array(data["vectors"])

    # Find top 3 relevant chunks
    q_vec = np.array(llm.embed_text(question))  # or embed with SentenceTransformer
    sims = cosine_similarity([q_vec], vectors)[0]
    top_idxs = np.argsort(sims)[-3:][::-1]
    context = "\n".join([chunks[i] for i in top_idxs])

    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template="""
You are a movie analyst AI. Using the following movie context, answer conversationally.
Context:
{context}

Question: {question}
"""
    )
    final_prompt = prompt.format(context=context, question=question)
    response = await llm.ainvoke(final_prompt)
    return response.content