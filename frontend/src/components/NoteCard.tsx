"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Note } from "@/types";
import JobStatusBadge from "./JobStatusBadge";
import { Globe, Upload, Film, Clock, Video } from "lucide-react";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <Video className="h-3.5 w-3.5 text-[#E85234]" />,
  instagram: <Film className="h-3.5 w-3.5 text-[#E85234]" />,
  tiktok: <Film className="h-3.5 w-3.5 text-[#6B6560]" />,
  upload: <Upload className="h-3.5 w-3.5 text-[#6B6560]" />,
};

interface Props {
  note: Note;
}

export default function NoteCard({ note }: Props) {
  const tags = (note.note_tags ?? []).slice(0, 3);
  const platformIcon = PLATFORM_ICONS[note.platform] ?? <Globe className="h-3.5 w-3.5 text-[#6B6560]" />;
  const isProcessing = note.status !== "done" && note.status !== "failed";

  return (
    <Link href={`/note/${note.id}`}>
      <div className="group flex flex-col bg-[#E8E4DC] border-2 border-[#1C1C1C] hover:shadow-[5px_5px_0px_#1C1C1C] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-[#D8D3CA] border-b-2 border-[#1C1C1C] overflow-hidden">
          {note.thumbnail_url ? (
            <img
              src={note.thumbnail_url}
              alt={note.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#C4BFB8]">
              <Film className="h-10 w-10" />
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-[#F0EDE6]/85 flex items-center justify-center">
              <JobStatusBadge status={note.status} message={note.status_message} />
            </div>
          )}

          {note.duration_seconds && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-[#1C1C1C] text-[#F0EDE6] text-[10px] font-black">
              <Clock className="h-2.5 w-2.5" />
              {Math.floor(note.duration_seconds / 60)}:{String(note.duration_seconds % 60).padStart(2, "0")}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-black text-sm leading-snug line-clamp-2 text-[#1C1C1C] uppercase tracking-wide">
              {note.title || "Processing..."}
            </h3>
            <div className="shrink-0 mt-0.5">{platformIcon}</div>
          </div>

          {note.summary && (
            <p className="text-xs text-[#6B6560] line-clamp-2 leading-relaxed">
              {note.summary}
            </p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-1">
            {note.status === "done" ? (
              <>
                {note.category && (
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#E85234] text-white border border-[#1C1C1C]">
                    {note.category}
                  </span>
                )}
                {tags.map(({ tag }) => (
                  <span key={tag} className="px-2 py-0.5 text-[10px] font-bold border border-[#1C1C1C]/40 text-[#6B6560]">
                    {tag}
                  </span>
                ))}
              </>
            ) : (
              <JobStatusBadge status={note.status} message={note.status_message} />
            )}
          </div>

          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A8580] mt-1">
            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
          </div>
        </div>
      </div>
    </Link>
  );
}
