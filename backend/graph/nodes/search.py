
from ..state import State
from ...services.tavily import tavilyClient 

def search(state : State) -> dict:
    print('Searching for topic:', state['topic'])

    """ Searches the web for the given topic and returns a list of relevant links. """

    response = tavilyClient.search(state['topic'])
    # print('answer' , response['results'])
    urls = [result['url'] for result in response['results']]
    print('Found URLs:', urls)
    return {'urls': urls}



