"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { ArrowLeft, Brain, ExternalLink, ChevronDown, ChevronUp, Loader2, Trash2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchNote, deleteNote, updateCategory } from "@/lib/api";
import { Note } from "@/types";
import JobStatusBadge from "./JobStatusBadge";
import TagEditor from "./TagEditor";
import TranscriptViewer from "./TranscriptViewer";
import KeyFrameGallery from "./KeyFrameGallery";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Education", "Cooking", "Fitness", "Tech/Coding", "Finance",
  "Travel", "Entertainment", "Health", "Design", "Business", "Other",
];

function Section({ title, children, defaultOpen = true }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-2 border-[#1C1C1C]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-[#E0DCD4] hover:bg-[#D8D3CA] transition-colors text-left border-b-2 border-[#1C1C1C]"
      >
        <span className="font-black text-[11px] uppercase tracking-widest text-[#1C1C1C]">{title}</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-[#6B6560]" />
          : <ChevronDown className="h-4 w-4 text-[#6B6560]" />}
      </button>
      {open && <div className="px-5 py-4 bg-[#F0EDE6]">{children}</div>}
    </div>
  );
}

interface Props {
  noteId: string;
  user: User;
}

export default function NoteDetailPage({ noteId, user }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
  }, []);

  const loadNote = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchNote(token, noteId);
      setNote(data);
    } catch {
      toast.error("Failed to load note");
    } finally {
      setLoading(false);
    }
  }, [token, noteId]);

  useEffect(() => { if (token) loadNote(); }, [loadNote, token]);

  useEffect(() => {
    if (!token) return;
    const channel = supabase
      .channel(`note_${noteId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "notes", filter: `id=eq.${noteId}`,
      }, (payload) => {
        const updated = payload.new as Note;
        if (updated.status === "done") { loadNote(); toast.success("Processing complete!"); }
        else setNote((prev) => (prev ? { ...prev, ...updated } : null));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token, noteId, loadNote]);

  async function handleDelete() {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteNote(token, noteId);
      router.push("/dashboard");
      toast.success("Note deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function handleCategoryChange(category: string) {
    if (!note || !token) return;
    try {
      await updateCategory(token, noteId, category);
      setNote((prev) => (prev ? { ...prev, category } : null));
      toast.success("Category updated");
    } catch { toast.error("Failed to update category"); }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F0EDE6" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#E85234] border-t-transparent animate-spin" />
          <p className="text-[11px] font-black uppercase tracking-widest text-[#6B6560]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "#F0EDE6" }}
      >
        <p className="text-[#6B6560] font-bold uppercase tracking-wider text-sm">Note not found.</p>
        <Link href="/dashboard" className="text-[11px] font-black uppercase tracking-widest text-[#E85234] border-b-2 border-[#E85234]">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const tags = note.note_tags ?? [];
  const frames = (note.note_frames ?? []).sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  return (
    <div
      className="min-h-screen text-[#1C1C1C]"
      style={{
        backgroundColor: "#F0EDE6",
        backgroundImage:
          "linear-gradient(rgba(28,28,28,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(28,28,28,0.045) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 border-b-2 border-[#1C1C1C]" style={{ backgroundColor: "#F0EDE6" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-[#6B6560] hover:text-[#1C1C1C] transition text-[11px] font-black uppercase tracking-widest"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-[#1C1C1C]/20" />
            <Brain className="h-4 w-4 text-[#E85234]" />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={loadNote}
              className="p-2 text-[#6B6560] hover:text-[#1C1C1C] border-2 border-transparent hover:border-[#1C1C1C] transition"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-[#6B6560] hover:text-red-600 border-2 border-transparent hover:border-red-600 transition disabled:opacity-50"
              title="Delete note"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {/* Title block */}
        <div className="border-2 border-[#1C1C1C] bg-[#E8E4DC] p-6 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <JobStatusBadge status={note.status} message={note.status_message} />
            {note.platform && (
              <span className="text-[10px] font-black uppercase tracking-widest text-[#8A8580]">
                {note.platform}
              </span>
            )}
            {note.original_url && (
              <a
                href={note.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#E85234] border-b border-[#E85234]"
              >
                Original Video <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black leading-tight uppercase tracking-tight">
            {note.title}
          </h1>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#8A8580]">Category:</span>
            <select
              value={note.category ?? ""}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-2 py-1 border-2 border-[#1C1C1C] bg-[#F0EDE6] text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] focus:outline-none focus:border-[#E85234]"
            >
              <option value="">Uncategorized</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Thumbnail + summary */}
        <div className="grid md:grid-cols-3 gap-4">
          {note.thumbnail_url && (
            <div className="md:col-span-1 border-2 border-[#1C1C1C] overflow-hidden aspect-video">
              <img src={note.thumbnail_url} alt={note.title} className="w-full h-full object-cover" />
            </div>
          )}
          {note.summary && (
            <div className={`${note.thumbnail_url ? "md:col-span-2" : "md:col-span-3"} border-2 border-[#1C1C1C] bg-[#E8E4DC] p-5`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#E85234] mb-2">Summary</p>
              <p className="text-[#1C1C1C] leading-relaxed text-sm">{note.summary}</p>
            </div>
          )}
        </div>

        {/* Key points */}
        {note.key_points?.length > 0 && (
          <Section title={`Key Points (${note.key_points.length})`}>
            <ul className="space-y-2.5">
              {note.key_points.map((point, i) => (
                <li key={i} className="flex gap-3 text-sm text-[#1C1C1C]">
                  <span className="shrink-0 font-black text-[#E85234]">{String(i + 1).padStart(2, "0")}.</span>
                  {point}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Important moments */}
        {note.important_moments?.length > 0 && (
          <Section title="Important Moments">
            <div className="space-y-3">
              {note.important_moments.map((moment, i) => (
                <div key={i} className="flex gap-3">
                  <span className="shrink-0 text-[10px] font-black bg-[#E85234] text-white px-2 py-1 h-fit tracking-wider">
                    {moment.timestamp}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#1C1C1C]">{moment.description}</p>
                    {moment.reason && <p className="text-xs text-[#6B6560] mt-0.5">{moment.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Key frames */}
        <Section title={`Key Frames (${frames.length})`}>
          <KeyFrameGallery frames={frames} />
        </Section>

        {/* Transcript */}
        <Section title="Transcript" defaultOpen={false}>
          <TranscriptViewer segments={note.transcript ?? []} />
        </Section>

        {/* Tags */}
        <Section title="Tags">
          {token && <TagEditor noteId={noteId} token={token} tags={tags} onChanged={loadNote} />}
        </Section>

        {/* Visible text */}
        {note.visible_text?.length > 0 && (
          <Section title="Text Seen In Video" defaultOpen={false}>
            <div className="flex flex-wrap gap-2">
              {note.visible_text.map((text, i) => (
                <span key={i} className="px-2.5 py-1 border-2 border-[#1C1C1C] text-sm font-mono text-[#1C1C1C]">
                  {text}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Related resources */}
        {note.resources?.length > 0 && (
          <Section title="Related Resources">
            <div className="space-y-2">
              {note.resources.map((res, i) => (
                <a
                  key={i}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 border-2 border-[#1C1C1C] bg-[#E8E4DC] hover:bg-[#E0DCD4] hover:shadow-[3px_3px_0px_#1C1C1C] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all group"
                >
                  <ExternalLink className="h-4 w-4 text-[#E85234] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#1C1C1C] group-hover:text-[#E85234] transition-colors">
                      {res.title}
                    </p>
                    {res.reason && <p className="text-xs text-[#6B6560] mt-0.5">{res.reason}</p>}
                  </div>
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Review questions */}
        {note.review_questions?.length > 0 && (
          <Section title="Review Questions" defaultOpen={false}>
            <ol className="space-y-2.5">
              {note.review_questions.map((q, i) => (
                <li key={i} className="text-sm text-[#1C1C1C] flex gap-3">
                  <span className="shrink-0 font-black text-[#E85234]">{String(i + 1).padStart(2, "0")}.</span>
                  {q}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Error */}
        {note.status === "failed" && note.error_message && (
          <div className="p-4 border-2 border-red-600 bg-red-50 text-red-700 text-sm">
            <strong className="font-black uppercase tracking-wider">Processing Error: </strong>
            {note.error_message}
          </div>
        )}
      </main>
    </div>
  );
}
