import os
from dotenv import load_dotenv
load_dotenv()
from firecrawl import Firecrawl

firecrawl = Firecrawl(
  api_key= os.getenv("FIRECRAWL_API_KEY")
)



