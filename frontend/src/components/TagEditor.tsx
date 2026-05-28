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
    if (tags.some((t) => t.tag === tag)) { toast.error("Tag already exists"); return; }
    setLoading("add");
    try {
      await addTag(token, noteId, tag);
      setInput("");
      onChanged();
      toast.success(`Added: ${tag}`);
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tags.map(({ tag, source }) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 border-2 text-[11px] font-black uppercase tracking-wider ${
              source === "ai"
                ? "border-[#E85234] text-[#E85234] bg-[#E85234]/5"
                : "border-[#1C1C1C] text-[#1C1C1C] bg-transparent"
            }`}
          >
            {source === "ai" && <span className="text-[9px] font-black">AI</span>}
            {tag}
            <button
              onClick={() => handleRemove(tag)}
              disabled={loading === tag}
              className="text-current opacity-40 hover:opacity-100 transition ml-0.5"
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
          className="flex-1 px-3 py-2 border-2 border-[#1C1C1C] bg-[#F0EDE6] text-[#1C1C1C] text-sm placeholder-[#8A8580] focus:outline-none focus:border-[#E85234]"
          maxLength={40}
        />
        <button
          type="submit"
          disabled={loading === "add" || !input.trim()}
          className="px-4 py-2 bg-[#1C1C1C] text-[#F0EDE6] text-[11px] font-black uppercase tracking-widest border-2 border-[#1C1C1C] hover:bg-[#E85234] hover:border-[#E85234] transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </form>
    </div>
  );
}
