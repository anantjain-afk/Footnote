from firecrawl import AsyncFirecrawl

def client_for_key(api_key: str) -> AsyncFirecrawl:
    """Create a client scoped to one research run, never a global user key."""
    return AsyncFirecrawl(api_key=api_key)
