
from tavily import TavilyClient
from dotenv import load_dotenv 
import os

tavilyClient = TavilyClient(api_key= os.getenv("TAVILY_API_KEY"))