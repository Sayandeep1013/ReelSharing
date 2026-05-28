"""
Main processing pipeline orchestrator.
Called as a FastAPI BackgroundTask after a note is created.
Streams status updates to Supabase so the frontend gets real-time feedback.
"""
import os
import time
import logging
import tempfile
import shutil

from database import supabase
from config import settings
from services import downloader, extractor, transcriber, vision, embedder, summarizer, researcher, youtube

logger = logging.getLogger(__name__)


def _update_note(note_id: str, **fields):
    try:
        supabase.table("notes").update(fields).eq("id", note_id).execute()
    except Exception as e:
        logger.error("[%s] DB update failed (fields: %s): %s", note_id[:8], list(fields.keys()), e)


def _status(note_id: str, status: str, message: str):
    _update_note(note_id, status=status, status_message=message)
    logger.info("[%s] %-14s %s", note_id[:8], status.upper(), message)


def _step(note_id: str, label: str):
    """Return a context-manager-like dict for timing a pipeline step."""
    logger.info("[%s] ── STEP: %s", note_id[:8], label)
    return time.monotonic()


def _step_done(note_id: str, label: str, t0: float):
    elapsed = time.monotonic() - t0
    logger.info("[%s] ✓  %s  (%.1fs)", note_id[:8], label, elapsed)


async def _upload_frame_to_storage(note_id: str, frame: dict) -> dict:
    path = frame["path"]
    storage_path = f"{note_id}/frame_{frame['index']:03d}.jpg"
    try:
        with open(path, "rb") as f:
            data = f.read()
        supabase.storage.from_("frames").upload(
            storage_path,
            data,
            file_options={"content-type": "image/jpeg", "upsert": "true"},
        )
        public_url = supabase.storage.from_("frames").get_public_url(storage_path)
        logger.debug("[%s] Frame %s uploaded → %s", note_id[:8], frame["index"], public_url)
    except Exception as e:
        logger.error(
            "[%s] ✗ Frame upload FAILED (index=%s, path=%s): %s",
            note_id[:8], frame["index"], path, e,
        )
        public_url = None
    return {**frame, "storage_path": storage_path, "public_url": public_url}


async def _save_frames_to_db(note_id: str, frames: list[dict]):
    rows = [
        {
            "note_id": note_id,
            "frame_index": f.get("index", 0),
            "timestamp_seconds": f.get("timestamp_seconds", 0),
            "storage_path": f.get("storage_path"),
            "public_url": f.get("public_url"),
            "description": f.get("description", ""),
            "ocr_text": "",
        }
        for f in frames
    ]
    if rows:
        try:
            supabase.table("note_frames").insert(rows).execute()
            logger.info("[%s] Saved %d frames to DB", note_id[:8], len(rows))
        except Exception as e:
            logger.error("[%s] ✗ note_frames insert FAILED: %s", note_id[:8], e)


async def _save_embeddings_to_db(note_id: str, transcript: list[dict], frames: list[dict]):
    chunks, texts = [], []

    for seg in transcript:
        text = seg.get("text", "").strip()
        if text:
            chunks.append({
                "note_id": note_id,
                "chunk_type": "transcript",
                "chunk_text": text,
                "timestamp_start": seg.get("start"),
                "timestamp_end": seg.get("end"),
            })
            texts.append(text)

    for f in frames:
        desc = f.get("description", "").strip()
        if desc:
            chunks.append({
                "note_id": note_id,
                "chunk_type": "frame_description",
                "chunk_text": desc,
                "timestamp_start": f.get("timestamp_seconds"),
                "timestamp_end": None,
            })
            texts.append(desc)

    logger.info("[%s] Embedding %d chunks (%d transcript, %d frames)",
                note_id[:8], len(texts),
                sum(1 for c in chunks if c["chunk_type"] == "transcript"),
                sum(1 for c in chunks if c["chunk_type"] == "frame_description"))

    if not texts:
        logger.warning("[%s] No embeddable text found — skipping Jina call", note_id[:8])
        return

    try:
        embeddings = await embedder.get_embeddings(texts)
        rows = [{**chunk, "embedding": emb} for chunk, emb in zip(chunks, embeddings)]
        for i in range(0, len(rows), 50):
            supabase.table("note_embeddings").insert(rows[i: i + 50]).execute()
        logger.info("[%s] Saved %d embeddings to pgvector", note_id[:8], len(rows))
    except Exception as e:
        logger.error("[%s] ✗ Embedding pipeline FAILED: %s", note_id[:8], e)


async def _save_tags_to_db(note_id: str, ai_tags: list[str]):
    rows = [{"note_id": note_id, "tag": tag.lower().strip(), "source": "ai"}
            for tag in ai_tags if tag.strip()]
    if rows:
        try:
            supabase.table("note_tags").upsert(rows, on_conflict="note_id,tag").execute()
            logger.info("[%s] Saved %d AI tags", note_id[:8], len(rows))
        except Exception as e:
            logger.error("[%s] ✗ Tag insert FAILED: %s", note_id[:8], e)


async def run_pipeline(note_id: str, url: str = None, local_video_path: str = None):
    """
    Full processing pipeline. url XOR local_video_path must be provided.
    """
    logger.info("=" * 60)
    logger.info("[%s] PIPELINE START  url=%s  upload=%s",
                note_id[:8], url or "-", local_video_path or "-")

    work_dir = tempfile.mkdtemp(prefix="reelsharing_")
    pipeline_start = time.monotonic()

    try:
        # ── 1. Download / prepare ─────────────────────────────────────────
        t = _step(note_id, "Download / prepare")
        is_youtube = bool(url and downloader.get_platform_from_url(url) == "youtube")

        if is_youtube:
            # YouTube path: fetch metadata + transcript via API, skip video download
            _status(note_id, "downloading", "Fetching YouTube metadata...")
            video_id = youtube.extract_video_id(url)
            metadata = await youtube.get_metadata(url, video_id)
            _step_done(note_id, "YouTube metadata", t)

            _update_note(
                note_id,
                title=metadata.get("title", "")[:255],
                thumbnail_url=metadata.get("thumbnail", ""),
                metadata=metadata,
            )

            t = _step(note_id, "YouTube transcript")
            _status(note_id, "transcribing", "Fetching YouTube captions...")
            transcript_segments = youtube.get_transcript(video_id)
            _step_done(note_id, "YouTube transcript", t)
            logger.info("[%s] transcript: %d segments", note_id[:8], len(transcript_segments))

            uploaded_frames = []

        elif url:
            # Non-YouTube URL: full yt-dlp download + extract + transcribe + vision
            _status(note_id, "downloading", "Fetching video from URL...")
            video_path, metadata = await downloader.download_from_url(url, work_dir)
            _step_done(note_id, "Download", t)
            logger.info("[%s] Video path: %s  |  size: %.1f MB",
                        note_id[:8], video_path, os.path.getsize(video_path) / 1_048_576)

            _update_note(
                note_id,
                title=metadata.get("title", "")[:255],
                thumbnail_url=metadata.get("thumbnail", ""),
                metadata=metadata,
            )

            t = _step(note_id, "Extract audio + frames")
            _status(note_id, "extracting", "Extracting audio and key frames...")
            audio_path = await extractor.extract_audio(video_path, work_dir)
            frames = await extractor.extract_frames(video_path, work_dir, max_frames=settings.max_key_frames)
            _step_done(note_id, "Extract", t)
            logger.info("[%s] audio: %s  |  frames: %d", note_id[:8], audio_path, len(frames))

            t = _step(note_id, "Whisper transcription")
            _status(note_id, "transcribing", "Transcribing audio...")
            transcript_segments = await transcriber.transcribe(audio_path)
            _step_done(note_id, "Transcription", t)
            logger.info("[%s] transcript: %d segments", note_id[:8], len(transcript_segments))

            t = _step(note_id, f"Vision analysis ({len(frames)} frames)")
            _status(note_id, "analyzing", f"Analyzing {len(frames)} key frames with AI vision...")
            analyzed_frames = await vision.analyze_frames(frames)
            _step_done(note_id, "Vision analysis", t)

            t = _step(note_id, "Frame upload to Supabase Storage")
            _status(note_id, "analyzing", "Uploading key frames to storage...")
            uploaded_frames = []
            for f in analyzed_frames:
                uf = await _upload_frame_to_storage(note_id, f)
                uploaded_frames.append(uf)
            await _save_frames_to_db(note_id, uploaded_frames)
            _step_done(note_id, "Frame upload", t)

        else:
            # Direct file upload
            _status(note_id, "downloading", "Preparing uploaded file...")
            video_path = local_video_path
            metadata = {
                "title": os.path.basename(video_path),
                "platform": "upload",
                "duration": None,
                "description": "",
                "thumbnail": "",
                "tags": [],
                "categories": [],
            }
            _step_done(note_id, "Upload prepare", t)
            logger.info("[%s] Video path: %s  |  size: %.1f MB",
                        note_id[:8], video_path, os.path.getsize(video_path) / 1_048_576)

            _update_note(
                note_id,
                title=metadata.get("title", "")[:255],
                thumbnail_url=metadata.get("thumbnail", ""),
                metadata=metadata,
            )

            t = _step(note_id, "Extract audio + frames")
            _status(note_id, "extracting", "Extracting audio and key frames...")
            audio_path = await extractor.extract_audio(video_path, work_dir)
            frames = await extractor.extract_frames(video_path, work_dir, max_frames=settings.max_key_frames)
            _step_done(note_id, "Extract", t)
            logger.info("[%s] audio: %s  |  frames: %d", note_id[:8], audio_path, len(frames))

            t = _step(note_id, "Whisper transcription")
            _status(note_id, "transcribing", "Transcribing audio...")
            transcript_segments = await transcriber.transcribe(audio_path)
            _step_done(note_id, "Transcription", t)
            logger.info("[%s] transcript: %d segments", note_id[:8], len(transcript_segments))

            t = _step(note_id, f"Vision analysis ({len(frames)} frames)")
            _status(note_id, "analyzing", f"Analyzing {len(frames)} key frames with AI vision...")
            analyzed_frames = await vision.analyze_frames(frames)
            _step_done(note_id, "Vision analysis", t)

            t = _step(note_id, "Frame upload to Supabase Storage")
            _status(note_id, "analyzing", "Uploading key frames to storage...")
            uploaded_frames = []
            for f in analyzed_frames:
                uf = await _upload_frame_to_storage(note_id, f)
                uploaded_frames.append(uf)
            await _save_frames_to_db(note_id, uploaded_frames)
            _step_done(note_id, "Frame upload", t)

        # ── 6. Embeddings ─────────────────────────────────────────────────
        t = _step(note_id, "Jina embeddings (dual pipeline)")
        _status(note_id, "embedding", "Indexing content for semantic search...")
        await _save_embeddings_to_db(note_id, transcript_segments, uploaded_frames)
        _step_done(note_id, "Embeddings", t)

        # ── 7. Research links ─────────────────────────────────────────────
        t = _step(note_id, "Tavily research")
        _status(note_id, "researching", "Finding related resources...")
        resources = await researcher.find_resources(
            title=metadata.get("title", ""),
            summary="",
            category="",
        )
        _step_done(note_id, "Research", t)
        logger.info("[%s] resources found: %d", note_id[:8], len(resources))

        # ── 8. LLM summary ────────────────────────────────────────────────
        t = _step(note_id, "Groq LLM summarization")
        _status(note_id, "summarizing", "Generating AI summary and insights...")
        structured = await summarizer.generate_structured_note(
            metadata=metadata,
            transcript=transcript_segments,
            frames=uploaded_frames,
        )
        _step_done(note_id, "Summarization", t)

        # ── 9. Persist everything ─────────────────────────────────────────
        await _save_tags_to_db(note_id, structured.get("suggested_tags", []))
        _update_note(
            note_id,
            status="done",
            status_message="Ready",
            title=structured.get("title", metadata.get("title", ""))[:255],
            category=structured.get("category", "Other"),
            summary=structured.get("summary", ""),
            key_points=structured.get("key_points", []),
            important_moments=structured.get("important_moments", []),
            visible_text=structured.get("visible_text", []),
            transcript=[
                {"start": s["start"], "end": s["end"], "text": s["text"]}
                for s in transcript_segments
            ],
            resources=resources,
            review_questions=structured.get("review_questions", []),
        )

        total = time.monotonic() - pipeline_start
        logger.info("[%s] ✓✓ PIPELINE COMPLETE in %.1fs", note_id[:8], total)
        logger.info("=" * 60)

    except Exception as e:
        logger.exception("[%s] ✗✗ PIPELINE FAILED: %s", note_id[:8], e)
        _update_note(
            note_id,
            status="failed",
            status_message="Processing failed",
            error_message=str(e),
        )

    finally:
        shutil.rmtree(work_dir, ignore_errors=True)
        logger.info("[%s] Work dir cleaned up", note_id[:8])
