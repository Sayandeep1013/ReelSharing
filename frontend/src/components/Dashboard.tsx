"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Brain, Search, LogOut, Plus, X, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchNotes, semanticSearch, pingServer } from "@/lib/api";
import { Note } from "@/types";
import NoteCard from "./NoteCard";
import SubmitVideo from "./SubmitVideo";

const CATEGORIES = [
  "Education", "Cooking", "Fitness", "Tech/Coding", "Finance",
  "Travel", "Entertainment", "Health", "Design", "Business", "Other",
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
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

  useEffect(() => {
    if (!token) return;
    const channel = supabase
      .channel("note_updates")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "notes",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const updated = payload.new as Note;
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)));
        if (updated.status === "done") toast.success(`"${updated.title}" is ready!`);
        else if (updated.status === "failed") toast.error(`Processing failed for "${updated.title}"`);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token, user.id]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function handleSubmitted() {
    loadNotes();
    setShowSubmit(false);
  }

  const avatarUrl = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.name || user.email;

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
      <header className="sticky top-0 z-30 border-b-2 border-[#1C1C1C]"
        style={{ backgroundColor: "#F0EDE6" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Brain className="h-5 w-5 text-[#E85234]" />
            <span className="font-black text-[11px] tracking-[0.2em] uppercase">ReelSharing</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSubmit((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider bg-[#E85234] text-white border-2 border-[#1C1C1C] shadow-[3px_3px_0px_#1C1C1C] hover:shadow-[1px_1px_0px_#1C1C1C] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Video</span>
            </button>
            {avatarUrl && (
              <img src={avatarUrl} alt={name} className="h-7 w-7 border-2 border-[#1C1C1C]" />
            )}
            <button
              onClick={signOut}
              className="p-1.5 text-[#6B6560] hover:text-[#1C1C1C] transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Submit form */}
        {showSubmit && token && (
          <div className="relative border-2 border-[#1C1C1C] bg-[#E8E4DC] p-1">
            <button
              onClick={() => setShowSubmit(false)}
              className="absolute top-2 right-2 z-10 p-1 text-[#6B6560] hover:text-[#1C1C1C] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <SubmitVideo token={token} onSubmitted={handleSubmitted} />
          </div>
        )}

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8580]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes by title, keywords..."
              className="w-full pl-9 pr-3 py-2 border-2 border-[#1C1C1C] bg-[#E8E4DC] text-[#1C1C1C] text-sm placeholder-[#8A8580] focus:outline-none focus:border-[#E85234]"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSearchMode((m) => (m === "text" ? "semantic" : "text"))}
              title={searchMode === "text" ? "Switch to AI semantic search" : "Switch to text search"}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-black uppercase tracking-wider border-2 transition-colors ${
                searchMode === "semantic"
                  ? "bg-[#1C1C1C] text-[#F0EDE6] border-[#1C1C1C]"
                  : "bg-transparent text-[#6B6560] border-[#1C1C1C] hover:text-[#1C1C1C]"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Search</span>
            </button>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border-2 border-[#1C1C1C] bg-[#E8E4DC] text-[#1C1C1C] text-[11px] font-black uppercase tracking-wider focus:outline-none focus:border-[#E85234]"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border-2 border-[#1C1C1C]/20 bg-[#E8E4DC]/50 aspect-video animate-pulse" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 border-2 border-[#1C1C1C]/20 flex items-center justify-center mb-6">
              <Brain className="h-8 w-8 text-[#C4BFB8]" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest text-[#6B6560] mb-2">
              {searchQuery || selectedCategory ? "No Notes Match Your Filters" : "Your Vault Is Empty"}
            </h2>
            <p className="text-[#8A8580] text-sm max-w-sm leading-relaxed">
              {searchQuery || selectedCategory
                ? "Try different keywords or clear the filters."
                : "Paste a video link or upload a file to create your first knowledge note."}
            </p>
            {!showSubmit && (
              <button
                onClick={() => setShowSubmit(true)}
                className="mt-6 flex items-center gap-2 px-5 py-3 text-[11px] font-black uppercase tracking-wider bg-[#E85234] text-white border-2 border-[#1C1C1C] shadow-[4px_4px_0px_#1C1C1C] hover:shadow-[2px_2px_0px_#1C1C1C] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Your First Video
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
