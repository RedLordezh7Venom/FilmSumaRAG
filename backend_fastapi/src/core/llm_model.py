from langchain_google_genai import ChatGoogleGenerativeAI,HarmBlockThreshold,HarmCategory
from langchain.prompts import PromptTemplate
import os
from dotenv import load_dotenv

load_dotenv()

llm = ChatGoogleGenerativeAI(model='gemini-2.0-flash-lite',
                             api_key = os.getenv('GEMINI_API_KEY'),
                             temperature = 0.7,
                             safety_settings={
                                 HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT:HarmBlockThreshold.BLOCK_NONE,
                                 HarmCategory.HARM_CATEGORY_HATE_SPEECH:HarmBlockThreshold.BLOCK_NONE,
                                 HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT:HarmBlockThreshold.BLOCK_NONE,
                                 HarmCategory.HARM_CATEGORY_HARASSMENT:HarmBlockThreshold.BLOCK_NONE,
                             })


from langchain.text_splitter import RecursiveCharacterTextSplitter

def split_text_into_chunks_from_text(text: str, chunk_size=10000, chunk_overlap=1000):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    return splitter.split_text(text)


async def generate_summary(text: str):
    
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
