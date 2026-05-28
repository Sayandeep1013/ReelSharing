"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { NoteTag } from "@/types";
import { addTag, removeTag } from "@/lib/api";

interface Props {
  noteId: string;
  token: string;
  tags: NoteTag[];
  onChanged: () => void;
}

export default function TagEditor({ noteId, token, tags, onChanged }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const tag = input.trim().toLowerCase();
    if (!tag) return;
    if (tags.some((t) => t.tag === tag)) {
      toast.error("Tag already exists");
      return;
    }
    setLoading("add");
    try {
      await addTag(token, noteId, tag);
      setInput("");
      onChanged();
      toast.success(`Added tag: ${tag}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add tag");
    } finally {
      setLoading(null);
    }
  }

  async function handleRemove(tag: string) {
    setLoading(tag);
    try {
      await removeTag(token, noteId, tag);
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove tag");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map(({ tag, source }) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50"
          >
            {source === "ai" && (
              <span className="text-cyan-500 text-[10px]">AI</span>
            )}
            {tag}
            <button
              onClick={() => handleRemove(tag)}
              disabled={loading === tag}
              className="text-slate-500 hover:text-red-400 transition ml-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a tag..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          maxLength={40}
        />
        <button
          type="submit"
          disabled={loading === "add" || !input.trim()}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition disabled:opacity-50 flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </form>
    </div>
  );
}
