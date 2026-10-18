"""
Centralised application settings.

All configuration lives here.  Every module imports `settings` from this
module instead of calling ``os.getenv()`` directly.  Pydantic Settings
validates at import-time so the app fails fast on missing keys.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from functools import lru_cache
from pathlib import Path
import os

class Settings(BaseSettings):
    """Application settings loaded from environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── LLM ───────────────────────────────────────────────────────────────
    groq_api_key: str
    groq_model: str = "openai/gpt-oss-20b"
    groq_temperature: float = 0.1

    # ── Search & Scraping ─────────────────────────────────────────────────
    tavily_api_key: str
    firecrawl_api_key: str
    # A separate, stable Fernet key for encrypting user-owned Firecrawl keys.
    firecrawl_key_encryption_key: str = ""

    # ── Observability ─────────────────────────────────────────────────────
    langchain_tracing_v2: bool = False
    langchain_api_key: str = ""
    langchain_project: str = "research-agent"

    # ── App ────────────────────────────────────────────────────────────────
    app_name: str = "Research Agent API"
    app_version: str = "1.0.0"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:5173"]

    # ── Database & Auth ───────────────────────────────────────────────────
    database_url: str = ""
    supabase_url: str = ""
    supabase_jwt_secret: str = ""

    # Shared rolling quotas. An unset URL fails closed only for paid operations.
    redis_url: str = ""
    rate_limit_key_prefix: str = "research-agent:local"
    rate_limit_reports: int = Field(default=10, gt=0)
    rate_limit_chat: int = Field(default=30, gt=0)
    rate_limit_window_seconds: int = Field(default=3600, gt=0)

    # ── Research pipeline tunables ────────────────────────────────────────
    max_iterations: int = 3
    judge_threshold: float = 0.7
    extract_max_chars: int = 3000

    # ── Deep Research tunables ────────────────────────────────────────────
    deep_max_research_rounds: int = int(os.environ.get("DEEP_MAX_ROUNDS", "2"))
    deep_max_results_per_query: int = 5
    deep_max_domains_per_source: int = 2
    deep_notes_per_source: int = 5
    deep_judge_threshold: float = 0.7
    deep_max_revisions: int = 2
    deep_max_sources_total: int = int(os.environ.get("DEEP_MAX_SOURCES", "15"))
    deep_target_claims_per_sq: int = 3
    deep_dev_mode: bool = os.environ.get("DEV_MODE", "false").lower() == "true"


@lru_cache()
def get_settings() -> Settings:
    """Return a cached singleton of the application settings."""
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
