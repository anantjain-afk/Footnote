from tavily import TavilyClient
from ..core.config import settings

tavilyClient = TavilyClient(api_key=settings.tavily_api_key)