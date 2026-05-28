"use client";

import { useState } from "react";
import { TranscriptSegment } from "@/types";
import { Search } from "lucide-react";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  segments: TranscriptSegment[];
}

export default function TranscriptViewer({ segments }: Props) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? segments.filter((s) =>
        s.text.toLowerCase().includes(search.toLowerCase())
      )
    : segments;

  if (!segments.length) {
    return (
      <p className="text-slate-500 text-sm italic">No transcript available for this video.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transcript..."
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div className="max-h-96 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
        {filtered.map((seg, i) => (
          <div
            key={i}
            className="flex gap-3 py-2 px-3 rounded-lg hover:bg-slate-800/50 transition group"
          >
            <span className="shrink-0 text-xs text-cyan-500 font-mono mt-0.5 w-10">
              {formatTime(seg.start)}
            </span>
            <p
              className="text-sm text-slate-300 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: search
                  ? seg.text.replace(
                      new RegExp(`(${search})`, "gi"),
                      '<mark class="bg-cyan-500/20 text-cyan-300 rounded px-0.5">$1</mark>'
                    )
                  : seg.text,
              }}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">No matches for "{search}"</p>
        )}
      </div>
    </div>
  );
}
