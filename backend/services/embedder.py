"""
Generate text embeddings using Jina AI API.
Used for both transcript segments (audio pipeline) and frame descriptions (visual pipeline).
"""
import logging
import httpx
from config import settings

logger = logging.getLogger(__name__)

JINA_URL = "https://api.jina.ai/v1/embeddings"
JINA_MODEL = "jina-embeddings-v3"
EMBED_DIMS = 1024


async def get_embeddings(texts: list[str], task: str = "retrieval.passage") -> list[list[float]]:
    """
    Returns 1024-dim embedding vectors, one per input text.
    task: 'retrieval.passage' for indexing, 'retrieval.query' for search.
    """
    if not texts:
        return []

    logger.info("Jina: embedding %d texts (model=%s, dims=%d, task=%s)",
                len(texts), JINA_MODEL, EMBED_DIMS, task)

    all_embeddings: list[list[float]] = []
    batch_size = 100

    async with httpx.AsyncClient(timeout=60.0) as client:
        for i in range(0, len(texts), batch_size):
            batch = texts[i: i + batch_size]
            logger.debug("Jina: batch %d–%d", i, i + len(batch) - 1)
            try:
                response = await client.post(
                    JINA_URL,
                    headers={
                        "Authorization": f"Bearer {settings.jina_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": JINA_MODEL,
                        "input": batch,
                        "dimensions": EMBED_DIMS,
                        "task": task,
                    },
                )
                response.raise_for_status()
                data = response.json()
                batch_embeddings = [item["embedding"] for item in data["data"]]
                all_embeddings.extend(batch_embeddings)
                logger.debug("Jina: batch returned %d embeddings", len(batch_embeddings))
            except httpx.HTTPStatusError as e:
                logger.error(
                    "Jina API HTTP error (status=%d, batch %d–%d): %s",
                    e.response.status_code, i, i + len(batch) - 1, e.response.text[:300],
                )
                raise
            except httpx.RequestError as e:
                logger.error("Jina API request error (batch %d–%d): %s", i, i + len(batch) - 1, e)
                raise

    logger.info("Jina: %d embeddings total", len(all_embeddings))
    return all_embeddings


async def get_query_embedding(query: str) -> list[float]:
    logger.info("Jina: embedding search query (%d chars)", len(query))
    embeddings = await get_embeddings([query], task="retrieval.query")
    return embeddings[0] if embeddings else []
