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
    ? segments.filter((s) => s.text.toLowerCase().includes(search.toLowerCase()))
    : segments;

  if (!segments.length) {
    return (
      <p className="text-[#8A8580] text-sm font-bold uppercase tracking-wider">
        No transcript available for this video.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8580]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transcript..."
          className="w-full pl-9 pr-3 py-2 border-2 border-[#1C1C1C] bg-[#F0EDE6] text-[#1C1C1C] text-sm placeholder-[#8A8580] focus:outline-none focus:border-[#E85234]"
        />
      </div>

      <div className="max-h-96 overflow-y-auto space-y-0.5 pr-1">
        {filtered.map((seg, i) => (
          <div
            key={i}
            className="flex gap-3 py-2 px-3 hover:bg-[#E0DCD4] transition-colors group"
          >
            <span className="shrink-0 text-[10px] font-black text-[#E85234] mt-0.5 w-10 tracking-wider">
              {formatTime(seg.start)}
            </span>
            <p
              className="text-sm text-[#1C1C1C] leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: search
                  ? seg.text.replace(
                      new RegExp(`(${search})`, "gi"),
                      '<mark style="background:#E85234;color:white;padding:0 2px">$1</mark>'
                    )
                  : seg.text,
              }}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-[#8A8580] text-sm font-bold uppercase tracking-wider text-center py-6">
            No matches for &quot;{search}&quot;
          </p>
        )}
      </div>
    </div>
  );
}
