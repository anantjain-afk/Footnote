
from ...services.tavily import tavilyClient 

def search(topic) :

    """ Searches the web for the given topic and returns a list of relevant links. """

    response = tavilyClient.search(topic )
    return response.results



