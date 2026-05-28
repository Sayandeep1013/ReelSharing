"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  Brain,
  Search,
  LogOut,
  Plus,
  Filter,
  X,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchNotes, semanticSearch, pingServer } from "@/lib/api";
import { Note } from "@/types";
import NoteCard from "./NoteCard";
import SubmitVideo from "./SubmitVideo";

const CATEGORIES = [
  "Education",
  "Cooking",
  "Fitness",
  "Tech/Coding",
  "Finance",
  "Travel",
  "Entertainment",
  "Health",
  "Design",
  "Business",
  "Other",
];

interface Props {
  user: User;
}

export default function Dashboard({ user }: Props) {
  const supabase = createClient();
  const [token, setToken] = useState<string>("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"text" | "semantic">("text");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);

  // Get session token
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
    // Ping backend to wake it up on load
    pingServer();
  }, []);

  const loadNotes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      let data;
      if (searchQuery && searchMode === "semantic") {
        data = await semanticSearch(token, searchQuery);
      } else {
        data = await fetchNotes(token, {
          search: searchQuery || undefined,
          category: selectedCategory || undefined,
        });
      }
      setNotes(data.notes ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery, searchMode, selectedCategory]);

  useEffect(() => {
    if (token) loadNotes();
  }, [loadNotes, token]);

  // Supabase Realtime — subscribe to note status changes for this user
  useEffect(() => {
    if (!token) return;

    const channel = supabase
      .channel("note_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Note;
          setNotes((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
          );
          if (updated.status === "done") {
            toast.success(`"${updated.title}" is ready!`);
          } else if (updated.status === "failed") {
            toast.error(`Processing failed for "${updated.title}"`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token, user.id]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function handleSubmitted(noteId: string) {
    // Add an optimistic pending note that will be updated via Realtime
    loadNotes();
    setShowSubmit(false);
  }

  const avatarUrl = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.name || user.email;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Brain className="h-5 w-5 text-cyan-400" />
            <span className="font-bold tracking-tight">ReelSharing</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSubmit((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Video</span>
            </button>
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={name}
                className="h-8 w-8 rounded-full ring-2 ring-slate-700"
              />
            )}
            <button
              onClick={signOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Submit form */}
        {showSubmit && token && (
          <div className="relative">
            <button
              onClick={() => setShowSubmit(false)}
              className="absolute -top-2 -right-2 z-10 p-1 rounded-full bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <SubmitVideo token={token} onSubmitted={handleSubmitted} />
          </div>
        )}

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes by title, keywords..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() =>
                setSearchMode((m) => (m === "text" ? "semantic" : "text"))
              }
              title={
                searchMode === "text"
                  ? "Switch to semantic (AI) search"
                  : "Switch to text search"
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                searchMode === "semantic"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {searchMode === "semantic" ? "AI Search" : "AI Search"}
              </span>
            </button>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl bg-slate-800/50 border border-slate-700/50 aspect-video animate-pulse"
              />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Brain className="h-12 w-12 text-slate-700 mb-4" />
            <h2 className="text-lg font-semibold text-slate-400 mb-2">
              {searchQuery || selectedCategory
                ? "No notes match your filters"
                : "Your vault is empty"}
            </h2>
            <p className="text-slate-600 text-sm max-w-sm">
              {searchQuery || selectedCategory
                ? "Try different keywords or clear the filters."
                : "Paste a video link or upload a file to create your first knowledge note."}
            </p>
            {!showSubmit && (
              <button
                onClick={() => setShowSubmit(true)}
                className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm transition"
              >
                <Plus className="h-4 w-4" />
                Add your first video
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
