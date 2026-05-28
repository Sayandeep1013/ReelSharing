-- ============================================================
-- ReelSharing - Supabase Schema
-- Run this in Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- NOTES TABLE
-- Each processed video becomes one note
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Source info
  title TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'unknown', -- youtube, instagram, tiktok, upload, other
  original_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,

  -- Processing state
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | downloading | extracting | transcribing | analyzing | summarizing | done | failed
  status_message TEXT DEFAULT 'Queued for processing...',
  error_message TEXT,

  -- AI-generated content
  category TEXT,
  summary TEXT,
  key_points JSONB DEFAULT '[]'::jsonb,
  important_moments JSONB DEFAULT '[]'::jsonb,
  visible_text JSONB DEFAULT '[]'::jsonb,
  transcript JSONB DEFAULT '[]'::jsonb,
  resources JSONB DEFAULT '[]'::jsonb,
  review_questions JSONB DEFAULT '[]'::jsonb,

  -- Raw metadata from yt-dlp or file upload
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NOTE TAGS TABLE
-- AI-generated and user-added tags, both searchable
-- ============================================================
CREATE TABLE IF NOT EXISTS note_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai', -- 'ai' or 'user'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(note_id, tag)
);

-- ============================================================
-- NOTE FRAMES TABLE
-- Key frames extracted from video, stored in Supabase Storage
-- ============================================================
CREATE TABLE IF NOT EXISTS note_frames (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
  frame_index INTEGER NOT NULL,
  timestamp_seconds FLOAT NOT NULL,
  storage_path TEXT,
  public_url TEXT,
  description TEXT,     -- from Groq Vision
  ocr_text TEXT,        -- visible text in frame
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NOTE EMBEDDINGS TABLE
-- Text + visual embeddings for semantic search via pgvector
-- ============================================================
CREATE TABLE IF NOT EXISTS note_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
  chunk_type TEXT NOT NULL,  -- 'transcript' | 'frame_description' | 'summary'
  chunk_text TEXT NOT NULL,
  timestamp_start FLOAT,
  timestamp_end FLOAT,
  embedding vector(1024),    -- Jina embeddings-v3 default dimension
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag);
CREATE INDEX IF NOT EXISTS idx_note_frames_note_id ON note_frames(note_id);
CREATE INDEX IF NOT EXISTS idx_note_embeddings_note_id ON note_embeddings(note_id);

-- Vector similarity search index (HNSW for fast ANN search)
CREATE INDEX IF NOT EXISTS idx_note_embeddings_vector
  ON note_embeddings USING hnsw (embedding vector_cosine_ops);

-- Full text search index on notes
CREATE INDEX IF NOT EXISTS idx_notes_fts ON notes
  USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(category, '')));

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_embeddings ENABLE ROW LEVEL SECURITY;

-- Notes: users see only their own
CREATE POLICY "notes_select_own" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes_insert_own" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update_own" ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes_delete_own" ON notes FOR DELETE USING (auth.uid() = user_id);

-- Tags: scoped to note ownership
CREATE POLICY "tags_select_own" ON note_tags FOR SELECT
  USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_tags.note_id AND notes.user_id = auth.uid()));
CREATE POLICY "tags_insert_own" ON note_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_tags.note_id AND notes.user_id = auth.uid()));
CREATE POLICY "tags_update_own" ON note_tags FOR UPDATE
  USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_tags.note_id AND notes.user_id = auth.uid()));
CREATE POLICY "tags_delete_own" ON note_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_tags.note_id AND notes.user_id = auth.uid()));

-- Frames: scoped to note ownership
CREATE POLICY "frames_select_own" ON note_frames FOR SELECT
  USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_frames.note_id AND notes.user_id = auth.uid()));

-- Embeddings: scoped to note ownership
CREATE POLICY "embeddings_select_own" ON note_embeddings FOR SELECT
  USING (EXISTS (SELECT 1 FROM notes WHERE notes.id = note_embeddings.note_id AND notes.user_id = auth.uid()));

-- ============================================================
-- SEMANTIC SEARCH FUNCTION
-- Called from backend with a query embedding to find similar notes
-- ============================================================
CREATE OR REPLACE FUNCTION search_notes_semantic(
  query_embedding vector(1024),
  p_user_id UUID,
  match_count INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE(
  note_id UUID,
  chunk_text TEXT,
  chunk_type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ne.note_id,
    ne.chunk_text,
    ne.chunk_type,
    1 - (ne.embedding <=> query_embedding) AS similarity
  FROM note_embeddings ne
  JOIN notes n ON n.id = ne.note_id
  WHERE
    n.user_id = p_user_id
    AND 1 - (ne.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ne.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- STORAGE BUCKETS
-- Run these separately or via Supabase dashboard
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('frames', 'frames', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);

-- Storage RLS for frames bucket (public read)
-- CREATE POLICY "frames_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'frames');
-- CREATE POLICY "frames_service_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'frames');

-- ============================================================
-- ENABLE REALTIME on notes table (for live status updates)
-- Run in Supabase dashboard: Database > Replication > Tables
-- Or via SQL:
-- ============================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE notes;
