"""
CRUD routes for notes, tags, and search.
All routes require a valid Supabase JWT in the Authorization header.
"""
from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from database import supabase
from services.embedder import get_query_embedding

router = APIRouter(prefix="/notes", tags=["notes"])


def _get_user_id(authorization: str) -> str:
    """Validate JWT and return user_id. Raises 401 on failure."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        user = supabase.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.get("/")
async def list_notes(
    authorization: str = Header(...),
    search: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
):
    user_id = _get_user_id(authorization)

    query = (
        supabase.table("notes")
        .select("*, note_tags(tag, source), note_frames(frame_index, timestamp_seconds, public_url, description)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
    )

    if category:
        query = query.eq("category", category)

    result = query.execute()
    notes = result.data or []

    # Filter by tag (done in Python since Supabase doesn't easily filter joined tables)
    if tag:
        tag_lower = tag.lower()
        notes = [n for n in notes if any(t["tag"] == tag_lower for t in (n.get("note_tags") or []))]

    # Filter by search text (simple title/summary match; semantic search is separate)
    if search:
        sl = search.lower()
        notes = [
            n for n in notes
            if sl in (n.get("title") or "").lower()
            or sl in (n.get("summary") or "").lower()
            or sl in (n.get("category") or "").lower()
        ]

    return {"notes": notes}


@router.get("/search/semantic")
async def semantic_search(
    q: str,
    authorization: str = Header(...),
):
    user_id = _get_user_id(authorization)

    # Embed the query
    query_embedding = await get_query_embedding(q)
    if not query_embedding:
        raise HTTPException(status_code=500, detail="Failed to generate query embedding")

    # Call the pgvector function
    result = supabase.rpc(
        "search_notes_semantic",
        {
            "query_embedding": query_embedding,
            "p_user_id": user_id,
            "match_count": 20,
            "similarity_threshold": 0.3,
        },
    ).execute()

    # Group by note_id and fetch note details
    if not result.data:
        return {"notes": []}

    note_ids = list({row["note_id"] for row in result.data})
    notes_result = (
        supabase.table("notes")
        .select("id, title, category, summary, status, thumbnail_url, created_at, note_tags(tag)")
        .in_("id", note_ids)
        .execute()
    )

    return {"notes": notes_result.data or [], "chunks": result.data}


@router.get("/{note_id}")
async def get_note(note_id: str, authorization: str = Header(...)):
    user_id = _get_user_id(authorization)

    result = (
        supabase.table("notes")
        .select("*, note_tags(tag, source), note_frames(frame_index, timestamp_seconds, public_url, description, ocr_text)")
        .eq("id", note_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Note not found")

    return result.data


@router.delete("/{note_id}")
async def delete_note(note_id: str, authorization: str = Header(...)):
    user_id = _get_user_id(authorization)

    # Verify ownership
    check = supabase.table("notes").select("id").eq("id", note_id).eq("user_id", user_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Note not found")

    supabase.table("notes").delete().eq("id", note_id).execute()
    return {"success": True}


@router.post("/{note_id}/tags")
async def add_tag(note_id: str, tag: str, authorization: str = Header(...)):
    user_id = _get_user_id(authorization)

    # Verify ownership
    check = supabase.table("notes").select("id").eq("id", note_id).eq("user_id", user_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Note not found")

    tag_clean = tag.lower().strip()
    if not tag_clean:
        raise HTTPException(status_code=400, detail="Tag cannot be empty")

    supabase.table("note_tags").upsert(
        {"note_id": note_id, "tag": tag_clean, "source": "user"},
        on_conflict="note_id,tag",
    ).execute()

    return {"success": True, "tag": tag_clean}


@router.delete("/{note_id}/tags/{tag}")
async def remove_tag(note_id: str, tag: str, authorization: str = Header(...)):
    user_id = _get_user_id(authorization)

    check = supabase.table("notes").select("id").eq("id", note_id).eq("user_id", user_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Note not found")

    supabase.table("note_tags").delete().eq("note_id", note_id).eq("tag", tag.lower()).execute()
    return {"success": True}


@router.patch("/{note_id}/category")
async def update_category(note_id: str, category: str, authorization: str = Header(...)):
    user_id = _get_user_id(authorization)

    check = supabase.table("notes").select("id").eq("id", note_id).eq("user_id", user_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Note not found")

    supabase.table("notes").update({"category": category}).eq("id", note_id).execute()
    return {"success": True}
