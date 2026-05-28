"""
YouTube-specific data fetching using youtube-transcript-api + oEmbed.
Bypasses yt-dlp download entirely to avoid bot detection on server IPs.
"""
import re
import logging
import httpx
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
)

logger = logging.getLogger(__name__)


def extract_video_id(url: str) -> str | None:
    patterns = [
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)([a-zA-Z0-9_-]{11})",
        r"youtube\.com/embed/([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


async def get_metadata(url: str, video_id: str) -> dict:
    """Basic metadata via YouTube oEmbed (no auth required)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://www.youtube.com/oembed",
                params={"url": url, "format": "json"},
            )
            resp.raise_for_status()
            data = resp.json()
        logger.info("YouTube oEmbed: title=%r  author=%r", data.get("title"), data.get("author_name"))
        return {
            "title": data.get("title", ""),
            "description": "",
            "duration": None,
            "uploader": data.get("author_name", ""),
            "upload_date": "",
            "view_count": None,
            "like_count": None,
            "tags": [],
            "categories": [],
            "thumbnail": data.get("thumbnail_url", f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"),
            "webpage_url": url,
            "platform": "youtube",
        }
    except Exception as e:
        logger.warning("YouTube oEmbed failed for %s: %s — using fallback", video_id, e)
        return {
            "title": f"YouTube video {video_id}",
            "description": "",
            "duration": None,
            "uploader": "",
            "upload_date": "",
            "view_count": None,
            "like_count": None,
            "tags": [],
            "categories": [],
            "thumbnail": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
            "webpage_url": url,
            "platform": "youtube",
        }


def get_transcript(video_id: str) -> list[dict]:
    """
    Fetch transcript via YouTube's caption API.
    Returns [{start, end, text}] compatible with the rest of the pipeline.
    """
    logger.info("YouTube transcript API: fetching video_id=%s", video_id)
    try:
        try:
            entries = YouTubeTranscriptApi.get_transcript(video_id, languages=["en", "en-US", "en-GB"])
        except NoTranscriptFound:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            transcript = transcript_list.find_generated_transcript(["en"])
            entries = transcript.fetch()

        segments = [
            {
                "start": e["start"],
                "end": e["start"] + e["duration"],
                "text": e["text"].strip(),
            }
            for e in entries
            if e.get("text", "").strip()
        ]
        logger.info("YouTube transcript API: %d segments fetched", len(segments))
        return segments

    except TranscriptsDisabled:
        logger.warning("YouTube transcript API: captions disabled for %s", video_id)
        return []
    except Exception as e:
        logger.warning("YouTube transcript API failed for %s: %s", video_id, e)
        return []
