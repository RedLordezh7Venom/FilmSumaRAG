from langchain_google_genai import ChatGoogleGenerativeAI,HarmBlockThreshold,HarmCategory
from langchain.prompts import PromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
import os
from dotenv import load_dotenv

load_dotenv()

llm = ChatGroq(model='llama-3.1-8b-instant',
                             api_key = os.getenv('GROQ_KEY'),
                             temperature = 0.6,
                            )

def split_text_into_chunks_from_text(text: str):
    percentage = 20
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=max(1, int(len(text) * percentage / 100)),
        chunk_overlap=max(0, int(len(text) * percentage * 0.001)),
        separators=["\n\n", "\n", ".", " ", ""]
    )
    return splitter.split_text(text)


async def generate_summary(text: str):
    print(len(text))
    #chunking for text
    chunks = split_text_into_chunks_from_text(text)
    # Use LangChain PromptTemplate for prompt creation
    prompt = PromptTemplate(
        input_variables=["chunk"],
        template="""You are tasked with narrating a movie for a website called Film -a Sum, 
          narrate this part of the movie, 
          as if you were an expert narrator, summarizing main plot details,
          keep in mind that this can be a continuation of a chunk from movie document(your context),
          so keep the narration natural and seamless 
          only respond with summary text\n{chunk}"""
    )
    chain = prompt | llm
    summaries = []
    for chunk in chunks:
        inputs = {"chunk":chunk}
        response = await chain.ainvoke(inputs)
        summaries.append(response.content if hasattr(response, "content") else response)

    final_summary = ' '.join(summaries)
    return final_summary
