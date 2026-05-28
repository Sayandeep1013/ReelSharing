"""
Analyze video frames using Groq Llama 3.2 Vision (dedicated vision key).
"""
import base64
import asyncio
import logging
from groq import Groq
from config import settings

logger = logging.getLogger(__name__)
_client = Groq(api_key=settings.groq_vision_api_key)

_FRAME_PROMPT = (
    "You are analyzing a frame from a video. Describe everything visible in specific detail. "
    "Cover all that apply: the setting and location; people, their actions, expressions, and body language; "
    "any text, captions, titles, or subtitles on screen; diagrams, charts, graphs, or data visualizations; "
    "code, formulas, or technical content; ingredients, products, or objects shown; "
    "steps, techniques, or demonstrations being performed; and the overall mood or atmosphere. "
    "Be concrete — name what you actually see. Keep your response under 150 words."
)


def _encode_image(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


async def analyze_frame(frame_info: dict) -> dict:
    idx = frame_info["index"]
    ts = frame_info["timestamp_seconds"]
    logger.info("Vision: analyzing frame %d at t=%.1fs  (model=%s)", idx, ts, settings.groq_vision_model)

    try:
        b64 = _encode_image(frame_info["path"])
        response = _client.chat.completions.create(
            model=settings.groq_vision_model,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                    {"type": "text", "text": _FRAME_PROMPT},
                ],
            }],
            max_tokens=200,
            temperature=0.2,
        )
        description = response.choices[0].message.content.strip()
        logger.info("Vision: frame %d → %d chars of description", idx, len(description))
        return {**frame_info, "description": description}

    except Exception as e:
        logger.error(
            "Vision API FAILED for frame %d at t=%.1fs (model=%s): %s",
            idx, ts, settings.groq_vision_model, e,
        )
        return {**frame_info, "description": ""}


async def analyze_frames(frames: list[dict]) -> list[dict]:
    """
    Analyze frames sequentially with a 2.1s delay between calls to respect
    the Groq vision rate limit of ~30 RPM.
    """
    logger.info("Vision: starting analysis of %d frames", len(frames))
    results = []
    for i, frame in enumerate(frames):
        if i > 0:
            await asyncio.sleep(2.1)
        result = await analyze_frame(frame)
        results.append(result)
    logger.info("Vision: completed all %d frames", len(results))
    return results
