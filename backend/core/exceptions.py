"""
Custom application exceptions.

Domain-specific errors that map to clean HTTP responses via
FastAPI exception handlers registered in main.py.
"""


class ResearchAgentError(Exception):
    """Base exception for all Research Agent errors."""

    def __init__(self, message: str = "An unexpected error occurred.", status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class LLMError(ResearchAgentError):
    """Raised when an LLM call fails after retries."""

    def __init__(self, message: str = "Language model request failed."):
        super().__init__(message=message, status_code=502)


class SearchError(ResearchAgentError):
    """Raised when web search (Tavily) fails."""

    def __init__(self, message: str = "Web search failed."):
        super().__init__(message=message, status_code=502)


class ExtractionError(ResearchAgentError):
    """Raised when content extraction (Firecrawl) fails."""

    def __init__(self, message: str = "Content extraction failed."):
        super().__init__(message=message, status_code=502)


class SessionNotFoundError(ResearchAgentError):
    """Raised when a session ID doesn't exist in the database."""

    def __init__(self, session_id: str):
        super().__init__(
            message=f"Session '{session_id}' not found.",
            status_code=404,
        )


class ReportNotReadyError(ResearchAgentError):
    """Raised when chat is attempted before the report is generated."""

    def __init__(self):
        super().__init__(
            message="Report is not ready yet. Cannot chat until research completes.",
            status_code=400,
        )
