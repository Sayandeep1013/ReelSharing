export type NoteStatus =
  | "pending"
  | "downloading"
  | "extracting"
  | "transcribing"
  | "analyzing"
  | "embedding"
  | "researching"
  | "summarizing"
  | "done"
  | "failed";

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface ImportantMoment {
  timestamp: string;
  description: string;
  reason: string;
}

export interface Resource {
  title: string;
  url: string;
  reason: string;
}

export interface NoteFrame {
  frame_index: number;
  timestamp_seconds: number;
  public_url: string | null;
  description: string | null;
  ocr_text: string | null;
}

export interface NoteTag {
  tag: string;
  source: "ai" | "user";
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  platform: string;
  original_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  status: NoteStatus;
  status_message: string | null;
  error_message: string | null;
  category: string | null;
  summary: string | null;
  key_points: string[];
  important_moments: ImportantMoment[];
  visible_text: string[];
  transcript: TranscriptSegment[];
  resources: Resource[];
  review_questions: string[];
  metadata: Record<string, unknown>;
  note_tags: NoteTag[];
  note_frames: NoteFrame[];
  created_at: string;
  updated_at: string;
}
