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



async def generate_summary(chunks):
    # Use LangChain PromptTemplate for prompt creation
    prompt = PromptTemplate(
        input_variables=["chunk"],
        template="You are tasked with summarizing movie for a website called Film -a Sum, summarize this part of the movie, only respond with summary text\n{chunk}"
    )
    chain = prompt | llm
    summaries = []
    for chunk in chunks:
        inputs = {"chunk":chunk}
        response = await chain.ainvoke(inputs)
        summaries.append(response.content if hasattr(response, "content") else response)

    final_summary = ' '.join(summaries)
    return final_summary
