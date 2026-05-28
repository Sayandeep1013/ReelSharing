"""
Extract audio (MP3) and key frames from a video file.
Uses imageio-ffmpeg for the FFmpeg binary and OpenCV for frame deduplication.
"""
import os
import logging
import asyncio
import subprocess
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np
import imageio_ffmpeg
import imagehash
from PIL import Image

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=2)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
logger.info("FFmpeg binary: %s", FFMPEG)


def _extract_audio_sync(video_path: str, output_dir: str) -> str:
    audio_path = os.path.join(output_dir, "audio.mp3")
    cmd = [
        FFMPEG, "-y", "-i", video_path,
        "-vn", "-acodec", "mp3", "-ab", "128k", "-ar", "16000",
        audio_path,
    ]
    logger.info("FFmpeg audio extraction: %s → %s", os.path.basename(video_path), audio_path)
    result = subprocess.run(cmd, capture_output=True, timeout=120)
    if result.returncode != 0:
        stderr = result.stderr.decode(errors="replace")
        logger.error("FFmpeg audio extraction FAILED (exit %d):\n%s", result.returncode, stderr)
        raise RuntimeError(f"FFmpeg audio extraction failed (exit {result.returncode}): {stderr[:500]}")

    size_kb = os.path.getsize(audio_path) / 1024
    logger.info("Audio extracted: %.1f KB", size_kb)
    return audio_path


def _extract_frames_sync(video_path: str, output_dir: str, max_frames: int = 10) -> list[dict]:
    logger.info("Opening video for frame extraction: %s", os.path.basename(video_path))
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.error("OpenCV could not open video: %s", video_path)
        raise RuntimeError(f"OpenCV could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps
    logger.info("Video: fps=%.1f  total_frames=%d  duration=%.1fs", fps, total_frames, duration)

    # Sample 1 frame every 5 seconds, skip first 2s
    sample_positions = []
    t = 2.0
    while t < duration - 1:
        sample_positions.append(t)
        t += 5.0

    # Always try mid-point and near-end
    for extra in [duration * 0.5, duration * 0.85]:
        if extra not in sample_positions:
            sample_positions.append(extra)
    sample_positions.sort()
    logger.info("Sampling %d candidate frames at 5s intervals", len(sample_positions))

    frames_dir = os.path.join(output_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    raw_frames = []
    for ts in sample_positions:
        frame_num = int(ts * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
        ret, frame = cap.read()
        if not ret:
            logger.debug("Could not read frame at t=%.1fs", ts)
            continue
        raw_frames.append((ts, frame))
    cap.release()
    logger.info("Read %d raw frames from video", len(raw_frames))

    # Deduplicate via perceptual hash; skip blank frames
    unique_frames = []
    seen_hashes = []
    skipped_blank = 0
    skipped_dup = 0

    for ts, frame in raw_frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        mean_val = gray.mean()
        if mean_val < 10 or mean_val > 245:
            skipped_blank += 1
            continue

        pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        phash = imagehash.phash(pil_img)
        if any(abs(phash - h) < 8 for h in seen_hashes):
            skipped_dup += 1
            continue

        seen_hashes.append(phash)
        unique_frames.append((ts, frame))

    logger.info(
        "Frame filter: %d unique  |  %d blank skipped  |  %d duplicates skipped",
        len(unique_frames), skipped_blank, skipped_dup,
    )

    if len(unique_frames) > max_frames:
        indices = np.linspace(0, len(unique_frames) - 1, max_frames, dtype=int)
        unique_frames = [unique_frames[i] for i in indices]
        logger.info("Capped to %d key frames", max_frames)

    result = []
    for idx, (ts, frame) in enumerate(unique_frames):
        frame_path = os.path.join(frames_dir, f"frame_{idx:03d}.jpg")
        cv2.imwrite(frame_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        result.append({"path": frame_path, "timestamp_seconds": ts, "index": idx})
        logger.debug("Saved frame %d at t=%.1fs → %s", idx, ts, frame_path)

    logger.info("Final key frames: %d", len(result))
    return result


async def extract_audio(video_path: str, output_dir: str) -> str:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _extract_audio_sync, video_path, output_dir)


async def extract_frames(video_path: str, output_dir: str, max_frames: int = 10) -> list[dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _extract_frames_sync, video_path, output_dir, max_frames)
