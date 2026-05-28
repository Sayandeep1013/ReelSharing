"""
Transcribe audio using Groq Whisper API (text key).
Returns list of timestamped segments.
"""
import os
import logging
from groq import Groq
from config import settings

logger = logging.getLogger(__name__)
_client = Groq(api_key=settings.groq_text_api_key)


async def transcribe(audio_path: str) -> list[dict]:
    """Returns list of {start, end, text} dicts. Returns [] if no speech or on failure."""
    if not os.path.exists(audio_path):
        logger.error("Whisper: audio file not found: %s", audio_path)
        return []

    file_size_kb = os.path.getsize(audio_path) / 1024
    if file_size_kb == 0:
        logger.warning("Whisper: audio file is empty — likely silent video")
        return []

    logger.info("Whisper: transcribing %.1f KB audio with model=%s", file_size_kb, settings.groq_whisper_model)

    try:
        with open(audio_path, "rb") as f:
            response = _client.audio.transcriptions.create(
                model=settings.groq_whisper_model,
                file=f,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
            )

        segments = []
        if hasattr(response, "segments") and response.segments:
            for seg in response.segments:
                text = seg.get("text", "").strip() if isinstance(seg, dict) else seg.text.strip()
                start = seg.get("start", 0) if isinstance(seg, dict) else seg.start
                end = seg.get("end", 0) if isinstance(seg, dict) else seg.end
                if text:
                    segments.append({"start": start, "end": end, "text": text})
            logger.info("Whisper: %d segments returned", len(segments))
        elif hasattr(response, "text") and response.text:
            logger.warning("Whisper: no segment timestamps in response — returning as single chunk")
            segments.append({"start": 0.0, "end": 0.0, "text": response.text.strip()})
        else:
            logger.warning("Whisper: empty response — video may have no speech")

        return segments

    except Exception as e:
        logger.error(
            "Whisper API FAILED (model=%s, file=%.1fKB): %s",
            settings.groq_whisper_model, file_size_kb, e,
        )
        return []
