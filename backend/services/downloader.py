"""
Download video from URL using yt-dlp, or accept a local file path.
Returns (video_path, metadata_dict).
"""
import os
import logging
import tempfile
import asyncio
from concurrent.futures import ThreadPoolExecutor

import yt_dlp

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=2)


def _detect_platform(url: str) -> str:
    u = url.lower()
    if "youtube.com" in u or "youtu.be" in u:
        return "youtube"
    if "instagram.com" in u:
        return "instagram"
    if "tiktok.com" in u:
        return "tiktok"
    if "twitter.com" in u or "x.com" in u:
        return "twitter"
    if "reddit.com" in u:
        return "reddit"
    if "vimeo.com" in u:
        return "vimeo"
    return "other"


def _download_sync(url: str, output_dir: str) -> tuple[str, dict]:
    platform = _detect_platform(url)
    logger.info("Downloading from %s  url=%s", platform.upper(), url)

    output_template = os.path.join(output_dir, "%(id)s.%(ext)s")
    ydl_opts = {
        "format": "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best",
        "outtmpl": output_template,
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "match_filter": yt_dlp.utils.match_filter_func("duration <= 180"),
        "extractor_args": {
            "youtube": {
                # tv_embedded and android clients bypass YouTube's bot detection on server IPs
                "player_client": ["tv_embedded", "android"],
            }
        },
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
    except yt_dlp.utils.DownloadError as e:
        logger.error("yt-dlp DownloadError for %s: %s", url, e)
        raise
    except yt_dlp.utils.ExtractorError as e:
        logger.error("yt-dlp ExtractorError (platform may be unsupported or private) for %s: %s", url, e)
        raise
    except Exception as e:
        logger.error("yt-dlp unexpected error for %s: %s", url, e)
        raise

    video_id = info.get("id", "video")
    video_path = None
    for f in os.listdir(output_dir):
        if f.startswith(video_id):
            video_path = os.path.join(output_dir, f)
            break

    if not video_path:
        for f in os.listdir(output_dir):
            if f.endswith((".mp4", ".mkv", ".webm", ".mov")):
                video_path = os.path.join(output_dir, f)
                break

    if not video_path:
        logger.error("yt-dlp completed but no output file found in %s", output_dir)
        raise FileNotFoundError("yt-dlp did not produce a video file")

    file_size_mb = os.path.getsize(video_path) / 1_048_576
    duration = info.get("duration", 0)
    logger.info(
        "Download complete: %s  size=%.1fMB  duration=%ds",
        os.path.basename(video_path), file_size_mb, duration or 0,
    )

    if duration and duration > 180:
        logger.warning("Video duration %ds exceeds 3-minute limit — yt-dlp match_filter may not have blocked it", duration)

    metadata = {
        "title": info.get("title", ""),
        "description": (info.get("description", "") or "")[:2000],
        "duration": duration,
        "uploader": info.get("uploader", ""),
        "upload_date": info.get("upload_date", ""),
        "view_count": info.get("view_count"),
        "like_count": info.get("like_count"),
        "tags": (info.get("tags") or [])[:20],
        "categories": info.get("categories", []),
        "thumbnail": info.get("thumbnail", ""),
        "webpage_url": info.get("webpage_url", url),
        "platform": platform,
    }
    return video_path, metadata


async def download_from_url(url: str, output_dir: str) -> tuple[str, dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _download_sync, url, output_dir)


def get_platform_from_url(url: str) -> str:
    return _detect_platform(url)
