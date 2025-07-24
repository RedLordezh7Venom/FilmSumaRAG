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
        template="""
        You are a professional film narrator for a movie summary website called *Film-a-Sum*. 
        Your task is to narrate a section of a movie in a seamless, engaging, and insightful way, 
        as if continuing from a previous part of the film. Your narration should feel natural and fluid, 
        maintaining the tone and rhythm of a compelling voiceover or expert commentary.

        Focus on clearly summarizing key plot events, character developments, and thematic shifts, 
        ensuring the user gets a full understanding of the story’s progression. 
        Write as if your audience is a film student, critic, or deep researcher seeking a rich, cohesive plot overview 
        — not just a surface-level summary.

        Avoid repetition or reintroducing elements already covered earlier. 
        Keep your language cinematic, intelligent, and immersive — not too casual, not overly dry.

        Only respond with the narration text, integrating this chunk naturally into the broader movie summary:
        \n{chunk}
          """
    )
    chain = prompt | llm
    summaries = []
    for chunk in chunks:
        inputs = {"chunk":chunk}
        response = await chain.ainvoke(inputs)
        summaries.append(response.content if hasattr(response, "content") else response)

    final_summary = ' '.join(summaries)
    return final_summary
