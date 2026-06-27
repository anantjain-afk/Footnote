from ...services.firecrawl import firecrawl
from ..state import State

def extract_contents(state: State) -> dict:
    """ Extracts the contents of the given URL and returns the text. """


    extracted_text = [firecrawl.scrape(url , formats=["markdown"]) for url in state['urls']]
    return {'extracted_text': extracted_text}

