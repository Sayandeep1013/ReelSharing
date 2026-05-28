"""
Generate structured note output using Groq LLM (text key).
"""
import json
import logging
from groq import Groq
from config import settings

logger = logging.getLogger(__name__)
_client = Groq(api_key=settings.groq_text_api_key)

_SYSTEM_PROMPT = """You are an AI assistant that processes video content into structured knowledge notes.
Your goal is to extract maximum useful information so the user can learn from the video without re-watching it.
Always respond with valid JSON only — no markdown, no extra text."""

_USER_PROMPT_TEMPLATE = """Analyze this video content and produce a structured JSON knowledge note.

VIDEO METADATA:
Title: {title}
Platform: {platform}
Duration: {duration}s
Description: {description}

TRANSCRIPT (timestamped):
{transcript_text}

KEY FRAME DESCRIPTIONS (visual content):
{frame_text}

Produce a JSON object with EXACTLY these keys:
{{
  "title": "clean, descriptive title (improve on original if needed)",
  "category": "one of: Education | Cooking | Fitness | Tech/Coding | Finance | Travel | Entertainment | Health | Design | Business | Other",
  "summary": "2-4 sentence summary of what this video teaches or shows",
  "key_points": ["5-7 key takeaways or facts from the video"],
  "important_moments": [
    {{"timestamp": "MM:SS", "description": "what happens", "reason": "why this moment matters"}}
  ],
  "visible_text": ["important text/captions/labels seen in the video"],
  "review_questions": ["3-5 questions to test understanding of the content"],
  "suggested_tags": ["8-12 specific, relevant tags (lowercase, no #)"]
}}

Be specific, not generic. Extract actual facts, steps, names, quantities, techniques from the content.
If the transcript is empty, rely on frame descriptions. If both are sparse, note that."""


def _format_transcript(segments: list[dict]) -> str:
    if not segments:
        return "(No transcript available)"
    lines = []
    for seg in segments:
        start = seg.get("start", 0)
        lines.append(f"[{int(start // 60):02d}:{int(start % 60):02d}] {seg.get('text', '').strip()}")
    return "\n".join(lines)


def _format_frames(frames: list[dict]) -> str:
    if not frames:
        return "(No frame descriptions available)"
    lines = []
    for f in frames:
        ts = f.get("timestamp_seconds", 0)
        desc = f.get("description", "").strip()
        if desc:
            lines.append(f"[{int(ts // 60):02d}:{int(ts % 60):02d}] {desc}")
    return "\n".join(lines) if lines else "(Frames had no notable visual content)"


async def generate_structured_note(
    metadata: dict,
    transcript: list[dict],
    frames: list[dict],
) -> dict:
    prompt = _USER_PROMPT_TEMPLATE.format(
        title=metadata.get("title", "Unknown"),
        platform=metadata.get("platform", "unknown"),
        duration=metadata.get("duration", "?"),
        description=(metadata.get("description", "") or "")[:500],
        transcript_text=_format_transcript(transcript),
        frame_text=_format_frames(frames),
    )

    logger.info(
        "Groq LLM: generating structured note (model=%s, prompt_chars=%d)",
        settings.groq_llm_model, len(prompt),
    )

    try:
        response = _client.chat.completions.create(
            model=settings.groq_llm_model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=2000,
        )

        raw = response.choices[0].message.content
        logger.info("Groq LLM: response received (%d chars)", len(raw))

        try:
            result = json.loads(raw)
            logger.info(
                "Groq LLM: parsed OK — category=%r  tags=%d  key_points=%d",
                result.get("category"), len(result.get("suggested_tags", [])), len(result.get("key_points", [])),
            )
            return result
        except json.JSONDecodeError as je:
            logger.error("Groq LLM: JSON parse FAILED: %s\nRaw output (first 500): %s", je, raw[:500])
            raise

    except Exception as e:
        logger.error("Groq LLM FAILED (model=%s): %s", settings.groq_llm_model, e)
        return {
            "title": metadata.get("title", "Untitled"),
            "category": "Other",
            "summary": "Processing encountered an error. Transcript and frames are still available.",
            "key_points": [],
            "important_moments": [],
            "visible_text": [],
            "review_questions": [],
            "suggested_tags": [],
        }
