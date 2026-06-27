from ...services.firecrawl import firecrawl
from ..state import State

def extract_contents(state: State) -> dict:
    print('Extracting contents from URLs:', state['urls'])
    """ Extracts the contents of the given URL and returns the text. """


    extracted_texts = []
    for url in state['urls']:
        extracted_text = firecrawl.scrape(url, formats=["markdown"])
        extracted_texts.append(extracted_text.markdown[:100])  # Limit to first 1000 characters for brevity
    print('\nExtracted texts:', extracted_texts)
    return {'extracted_text': extracted_texts}
