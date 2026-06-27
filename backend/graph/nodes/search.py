
from ..state import State
from ...services.tavily import tavilyClient 

def search(state : State) -> dict:

    """ Searches the web for the given topic and returns a list of relevant links. """

    response = tavilyClient.search(state['topic'])
    urls = [result.url for result in response.results]
    return {'urls': urls}



