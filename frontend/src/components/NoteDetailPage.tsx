"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  ArrowLeft,
  Brain,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
  RefreshCw,
} from "lucide-react";
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

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-800/50 hover:bg-slate-800 transition text-left"
      >
        <span className="font-semibold text-sm">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
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

  useEffect(() => {
    if (token) loadNote();
  }, [loadNote, token]);

  // Realtime status updates
  useEffect(() => {
    if (!token) return;
    const channel = supabase
      .channel(`note_${noteId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notes", filter: `id=eq.${noteId}` },
        (payload) => {
          const updated = payload.new as Note;
          if (updated.status === "done") {
            // Reload full note with frames and tags when done
            loadNote();
            toast.success("Processing complete!");
          } else {
            setNote((prev) => (prev ? { ...prev, ...updated } : null));
          }
        }
      )
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
    } catch {
      toast.error("Failed to update category");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4">
        <p className="text-slate-400">Note not found.</p>
        <Link href="/dashboard" className="text-cyan-400 hover:underline text-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const tags = note.note_tags ?? [];
  const frames = (note.note_frames ?? []).sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-slate-700" />
            <Brain className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadNote}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition disabled:opacity-50"
              title="Delete note"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* Title + meta */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <JobStatusBadge status={note.status} message={note.status_message} />
            {note.platform && (
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                {note.platform}
              </span>
            )}
            {note.original_url && (
              <a
                href={note.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition"
              >
                Original video <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{note.title}</h1>

          {/* Category picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Category:</span>
            <select
              value={note.category ?? ""}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Uncategorized</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Thumbnail + summary row */}
        <div className="grid md:grid-cols-3 gap-5">
          {note.thumbnail_url && (
            <div className="md:col-span-1 rounded-xl overflow-hidden aspect-video bg-slate-800">
              <img
                src={note.thumbnail_url}
                alt={note.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className={note.thumbnail_url ? "md:col-span-2" : "md:col-span-3"}>
            {note.summary && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 h-full">
                <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
                  Summary
                </h2>
                <p className="text-slate-300 leading-relaxed">{note.summary}</p>
              </div>
            )}
          </div>
        </div>

        {/* Key points */}
        {note.key_points?.length > 0 && (
          <Section title="Key Points">
            <ul className="space-y-2">
              {note.key_points.map((point, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300">
                  <span className="shrink-0 text-cyan-400 font-bold">{i + 1}.</span>
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
                  <span className="shrink-0 text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded h-fit">
                    {moment.timestamp}
                  </span>
                  <div>
                    <p className="text-sm text-white font-medium">{moment.description}</p>
                    {moment.reason && (
                      <p className="text-xs text-slate-500 mt-0.5">{moment.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Key Frames */}
        <Section title={`Key Frames (${frames.length})`} defaultOpen={true}>
          <KeyFrameGallery frames={frames} />
        </Section>

        {/* Transcript */}
        <Section title="Transcript" defaultOpen={false}>
          <TranscriptViewer segments={note.transcript ?? []} />
        </Section>

        {/* Tags */}
        <Section title="Tags">
          {token && (
            <TagEditor
              noteId={noteId}
              token={token}
              tags={tags}
              onChanged={loadNote}
            />
          )}
        </Section>

        {/* Visible text */}
        {note.visible_text?.length > 0 && (
          <Section title="Text Seen in Video" defaultOpen={false}>
            <div className="flex flex-wrap gap-2">
              {note.visible_text.map((text, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-slate-300"
                >
                  {text}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Related resources */}
        {note.resources?.length > 0 && (
          <Section title="Related Resources">
            <div className="space-y-3">
              {note.resources.map((res, i) => (
                <a
                  key={i}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 transition group"
                >
                  <ExternalLink className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition">
                      {res.title}
                    </p>
                    {res.reason && (
                      <p className="text-xs text-slate-500 mt-0.5">{res.reason}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Review questions */}
        {note.review_questions?.length > 0 && (
          <Section title="Review Questions" defaultOpen={false}>
            <ol className="space-y-2">
              {note.review_questions.map((q, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-3">
                  <span className="shrink-0 font-bold text-cyan-400">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Processing error */}
        {note.status === "failed" && note.error_message && (
          <div className="p-4 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-sm">
            <strong>Processing error:</strong> {note.error_message}
          </div>
        )}
      </main>
    </div>
  );
}
