from ...services.firecrawl import firecrawl

def extract_contents(url):
    """ Extracts the contents of the given URL and returns the text. """
    response = firecrawl.scrape(url , formats=["markdown"])
    print(response.markdown[:3000])

if __name__ == "__main__":
    url = "https://en.wikipedia.org/wiki/Artificial_intelligence"
    extract_contents(url)