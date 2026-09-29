from langchain_groq import ChatGroq
from ..core.config import settings

llm = ChatGroq(
    api_key=settings.groq_api_key,
    model=settings.groq_model,
    temperature=settings.groq_temperature,
    streaming=True,
)