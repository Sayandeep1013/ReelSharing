"""
Routes for submitting video URLs and file uploads for processing.
Processing is kicked off as a FastAPI BackgroundTask so the response
returns immediately and the user can continue using the app.
"""
import os
import uuid
import shutil
import tempfile

from fastapi import APIRouter, HTTPException, Header, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import JSONResponse

from database import supabase
from config import settings
from services.processor import run_pipeline
from services.downloader import get_platform_from_url

router = APIRouter(prefix="/process", tags=["process"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi"}


def _get_user_id(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        user = supabase.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _create_note(user_id: str, url: str = None, platform: str = "upload") -> str:
    result = supabase.table("notes").insert({
        "user_id": user_id,
        "title": "Processing...",
        "platform": platform,
        "original_url": url,
        "status": "pending",
        "status_message": "Queued for processing...",
    }).execute()
    return result.data[0]["id"]


@router.post("/url")
async def submit_url(
    url: str,
    background_tasks: BackgroundTasks,
    authorization: str = Header(...),
):
    user_id = _get_user_id(authorization)

    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL")

    platform = get_platform_from_url(url)
    note_id = _create_note(user_id, url=url, platform=platform)

    background_tasks.add_task(run_pipeline, note_id=note_id, url=url)

    return {"note_id": note_id, "status": "pending"}


@router.post("/upload")
async def submit_upload(
    background_tasks: BackgroundTasks,
    authorization: str = Header(...),
    file: UploadFile = File(...),
):
    user_id = _get_user_id(authorization)

    # Validate extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Validate file size
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max allowed: {settings.max_upload_size_mb}MB",
        )

    # Save to a persistent temp path (background task will clean up after)
    upload_dir = tempfile.mkdtemp(prefix="reelsharing_upload_")
    video_path = os.path.join(upload_dir, f"{uuid.uuid4()}{ext}")
    with open(video_path, "wb") as f:
        f.write(content)

    note_id = _create_note(user_id, url=None, platform="upload")

    async def run_and_cleanup(nid, vpath, udir):
        try:
            await run_pipeline(note_id=nid, local_video_path=vpath)
        finally:
            shutil.rmtree(udir, ignore_errors=True)

    background_tasks.add_task(run_and_cleanup, note_id, video_path, upload_dir)

    return {"note_id": note_id, "status": "pending"}
