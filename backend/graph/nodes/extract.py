from ...services.firecrawl import firecrawl
from firecrawl.v2.utils.error_handler import WebsiteNotSupportedError
from ..state import State
# for parallel extracting 
import asyncio


async def extract_contents(state: State) -> dict:
    print('Extracting contents from URLs:', state['urls'])
    """ Extracts the contents of the given URL and returns the text. """
    urls = state["urls"]
    tasks = [firecrawl.scrape(url, formats=["markdown"]) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # filter out any failed extractions
    contents = [r.markdown[:100] for r in results if not isinstance(r, Exception)]
    return {"extracted_text": contents}

    # for url in state['urls']:
    #     try:

    #         extracted_text = firecrawl.scrape(url, formats=["markdown"])
    #     except WebsiteNotSupportedError:
    #         print(f"Skipping unsupported website: {url}")
    #         continue
    #     extracted_texts.append(extracted_text.markdown[:100])  # Limit to first 1000 characters for brevity
    # print('\nExtracted texts:', extracted_texts)
    # return {'extracted_text': extracted_texts}
