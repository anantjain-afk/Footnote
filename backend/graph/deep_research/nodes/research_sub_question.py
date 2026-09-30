import time
import asyncio
import hashlib
import json
import os
from urllib.parse import urlparse
from collections import Counter
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage

from ....core.logging import get_logger
from ....core.config import settings
from ....services.firecrawl import firecrawl
from ....services.groq import llm
from ..state import SubQuestionState
from ...research.nodes.search import _search_with_retry
from ...research.nodes.extract import clean_extracted

logger = get_logger(__name__)

CACHE_DIR = ".dev_cache"


# ── Pydantic models for structured note extraction ────────────────────────────

class ExtractedNote(BaseModel):
    claim: str = Field(description="A specific factual claim from the source")
    evidence_quote: str = Field(
        description="A verbatim quote from the source text (max 2 sentences) that supports the claim"
    )

class NoteExtractionResult(BaseModel):
    notes: list[ExtractedNote]


# ── Utilities ─────────────────────────────────────────────────────────────────

def _get_domain(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return url


def _dedupe_and_filter(urls: list[str], seen_urls: list[str], budget: int, max_per_domain: int = 2) -> tuple[list[str], str]:
    """Filter seen URLs, apply domain limits and budget."""
    domain_counts: Counter = Counter()
    deduped = []
    
    for url in urls:
        if url in seen_urls:
            continue
        domain = _get_domain(url)
        if domain_counts[domain] < max_per_domain:
            deduped.append(url)
            domain_counts[domain] += 1
            if len(deduped) >= budget:
                break
                
    if not urls:
        return [], "Search returned 0 results."
    if not deduped:
        return [], "All search results were already seen or filtered by domain limits."
    return deduped, ""


# ── Caching for DEV_MODE ──────────────────────────────────────────────────────

def _get_cache(key: str) -> dict | None:
    if not settings.deep_dev_mode: return None
    path = os.path.join(CACHE_DIR, f"{key}.json")
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                return json.load(f)
        except Exception:
            return None
    return None

def _set_cache(key: str, data: dict):
    if not settings.deep_dev_mode: return
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, f"{key}.json")
    try:
        with open(path, "w") as f:
            json.dump(data, f)
    except Exception as e:
        logger.warning(f"Failed to cache {key}: {e}")

def _hash_key(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()

# ── Main node ─────────────────────────────────────────────────────────────────

async def research_sub_question(state: SubQuestionState) -> dict:
    sub_q = state["sub_question"]
    original_sq_id = state.get("original_sq_id", sub_q)
    seen_urls = state.get("seen_urls", [])
    budget = state.get("budget", 15)
    
    start = time.time()
    logger.info(f"Researching: {sub_q} (budget: {budget})", extra={"node": "research_sub_question"})

    empty_reason = ""

    # 1. Search
    search_key = f"search_{_hash_key(sub_q)}"
    cached_search = _get_cache(search_key)
    
    if cached_search:
        logger.info("Using cached search results")
        urls = cached_search.get("urls", [])
    else:
        try:
            response = _search_with_retry(sub_q, max_results=settings.deep_max_results_per_query)
            urls = [result["url"] for result in response["results"]]
            _set_cache(search_key, {"urls": urls})
        except Exception as e:
            logger.error(f"Search failed for sub-question: {e}")
            urls = []
            empty_reason = f"Search failed: {e}"

    # 2. Deduplicate + Budget
    if not empty_reason:
        urls, empty_reason = _dedupe_and_filter(
            urls, seen_urls, budget, max_per_domain=settings.deep_max_domains_per_source
        )

    # 3. Extract content
    contents = []
    sources = []
    
    if urls:
        tasks = []
        for url in urls:
            scrape_key = f"scrape_{_hash_key(url)}"
            cached = _get_cache(scrape_key)
            if cached:
                tasks.append(asyncio.sleep(0, result=cached)) # return mock object
            else:
                tasks.append(firecrawl.scrape(url, formats=["markdown"]))
                
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for url, result in zip(urls, results):
            if isinstance(result, Exception):
                logger.warning(f"Extraction failed for {url}: {result}")
                continue
                
            # Handle cached result vs real result
            if isinstance(result, dict):
                text = result.get("markdown", "")
                title = result.get("title", url)
            else:
                text = result.markdown
                title = getattr(result.metadata, "title", None) or url if hasattr(result, "metadata") else url
                _set_cache(f"scrape_{_hash_key(url)}", {"markdown": text, "title": title})
                
            text = text[: settings.extract_max_chars]
            cleaned = clean_extracted(text)
            domain = _get_domain(url)

            if cleaned.strip():
                contents.append(cleaned)
                sources.append({
                    "url": url,
                    "title": title,
                    "domain": domain,
                    "snippet": text[:800],
                })

        if not contents and not empty_reason:
            empty_reason = "Scraping failed or yielded no text for all URLs."

    # 4. LLM Note-taking
    notes = []
    if contents:
        formatted_sources = "\n\n---\n\n".join(
            f"[SOURCE: {src['title']}] (URL: {src['url']})\n{content}"
            for src, content in zip(sources, contents)
        )

        note_messages = [
            SystemMessage(
                content=f"""You are a research analyst. Extract key factual claims from the provided sources that are relevant to the research question.

Rules:
- Extract up to {settings.deep_notes_per_source} claims per source
- Each claim must be a specific, verifiable factual statement
- The evidence_quote MUST be a verbatim excerpt from the source text
- Only extract claims directly relevant to the research question"""
            ),
            HumanMessage(
                content=f"Research question: {sub_q}\n\nSources:\n{formatted_sources}\n\nExtract structured notes from these sources."
            ),
        ]

        extract_key = f"extract_{_hash_key(sub_q + str([s['url'] for s in sources]))}"
        cached_ext = _get_cache(extract_key)
        
        if cached_ext:
            logger.info("Using cached LLM extraction")
            extracted_notes = [ExtractedNote(**n) for n in cached_ext.get("notes", [])]
        else:
            try:
                note_llm = llm.with_structured_output(NoteExtractionResult, method="json_schema")
                extraction = await note_llm.ainvoke(note_messages)
                extracted_notes = extraction.notes
                _set_cache(extract_key, {"notes": [n.model_dump() for n in extracted_notes]})
            except Exception as e:
                logger.error(f"Note extraction failed: {e}")
                extracted_notes = []
                empty_reason = f"LLM extraction failed: {e}"

        for note in extracted_notes:
            matched_source = sources[0] if sources else {"url": "", "title": ""}
            for src, content in zip(sources, contents):
                if note.evidence_quote and note.evidence_quote.lower()[:60] in content.lower():
                    matched_source = src
                    break

            notes.append({
                "claim": note.claim,
                "evidence_quote": note.evidence_quote,
                "source_url": matched_source["url"],
                "source_title": matched_source["title"],
                "sub_question": original_sq_id,
                "followup_query": sub_q if state.get("is_followup") else None
            })
            
        if not notes and not empty_reason:
            empty_reason = "LLM found no relevant claims in the scraped text."

    duration = round((time.time() - start) * 1000)
    
    if empty_reason:
        logger.warning(f"Branch empty: {empty_reason} (query: {sub_q})")
        
    logger.info(
        f"Researched sub-question: {len(sources)} sources, {len(notes)} notes",
        extra={"node": "research_sub_question", "duration_ms": duration},
    )

    return {
        "sub_results": [{
            "sub_question": sub_q,
            "original_sq_id": original_sq_id,
            "sources": sources,
            "notes": notes,
            "empty_reason": empty_reason
        }],
        "all_notes": notes,
        "all_sources": sources,
    }
