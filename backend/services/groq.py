from langchain_groq import ChatGroq
import os 
from dotenv import load_dotenv , find_dotenv

load_dotenv(find_dotenv())

llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.1-8b-instant",
    temperature=0.1,
)   