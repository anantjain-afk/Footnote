import os
from dotenv import load_dotenv
load_dotenv()
from firecrawl import AsyncFirecrawl

firecrawl = AsyncFirecrawl(
  api_key= os.getenv("FIRECRAWL_API_KEY")
)



