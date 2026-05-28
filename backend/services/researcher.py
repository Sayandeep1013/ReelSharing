"""
Search for related research links using Tavily free tier.
Returns list of {title, url, reason} dicts.
"""
import logging
from tavily import TavilyClient
from config import settings

logger = logging.getLogger(__name__)
_client = TavilyClient(api_key=settings.tavily_api_key)


async def find_resources(title: str, summary: str, category: str) -> list[dict]:
    query = f"learn more about: {title}"
    if category and category.lower() not in ["other", "entertainment"]:
        query = f"{category} - {title} guide resources"

    logger.info("Tavily: searching with query: %r", query)

    try:
        results = _client.search(
            query=query,
            search_depth="basic",
            max_results=5,
            include_answer=False,
        )

        resources = []
        for r in (results.get("results") or []):
            url = r.get("url", "")
            t = r.get("title", "")
            snippet = (r.get("content") or "")[:200]
            if url and t:
                resources.append({"title": t, "url": url, "reason": snippet or "Related resource."})

        logger.info("Tavily: %d results returned for query %r", len(resources), query)
        return resources

    except Exception as e:
        logger.error("Tavily FAILED (query=%r): %s", query, e)
        return []
