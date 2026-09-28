from firecrawl import AsyncFirecrawl
from ..core.config import settings

firecrawl = AsyncFirecrawl(api_key=settings.firecrawl_api_key)
