from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


class SubmitURLRequest(BaseModel):
    url: str
    user_id: str


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class ImportantMoment(BaseModel):
    timestamp: str
    description: str
    reason: str


class Resource(BaseModel):
    title: str
    url: str
    reason: str


class NoteFrame(BaseModel):
    frame_index: int
    timestamp_seconds: float
    public_url: Optional[str]
    description: Optional[str]
    ocr_text: Optional[str]


class NoteResponse(BaseModel):
    id: str
    user_id: str
    title: str
    platform: str
    original_url: Optional[str]
    thumbnail_url: Optional[str]
    duration_seconds: Optional[int]
    status: str
    status_message: Optional[str]
    error_message: Optional[str]
    category: Optional[str]
    summary: Optional[str]
    key_points: list
    important_moments: list
    visible_text: list
    transcript: list
    resources: list
    review_questions: list
    metadata: dict
    tags: list[str] = []
    frames: list = []
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class AddTagRequest(BaseModel):
    note_id: str
    tag: str
    user_id: str


class UpdateCategoryRequest(BaseModel):
    note_id: str
    category: str
    user_id: str


class SearchRequest(BaseModel):
    query: str
    user_id: str
    semantic: bool = False
