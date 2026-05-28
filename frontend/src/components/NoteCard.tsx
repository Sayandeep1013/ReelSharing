"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Note } from "@/types";
import JobStatusBadge from "./JobStatusBadge";
import { Globe, Upload, Film, Clock, Video } from "lucide-react";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <Video className="h-3.5 w-3.5 text-red-400" />,
  instagram: <Film className="h-3.5 w-3.5 text-pink-400" />,
  tiktok: <Film className="h-3.5 w-3.5 text-slate-300" />,
  upload: <Upload className="h-3.5 w-3.5 text-slate-400" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  Education: "bg-blue-400/10 text-blue-400",
  Cooking: "bg-orange-400/10 text-orange-400",
  Fitness: "bg-green-400/10 text-green-400",
  "Tech/Coding": "bg-violet-400/10 text-violet-400",
  Finance: "bg-emerald-400/10 text-emerald-400",
  Entertainment: "bg-pink-400/10 text-pink-400",
  Health: "bg-teal-400/10 text-teal-400",
  Design: "bg-rose-400/10 text-rose-400",
  Business: "bg-amber-400/10 text-amber-400",
  Other: "bg-slate-400/10 text-slate-400",
};

interface Props {
  note: Note;
}

export default function NoteCard({ note }: Props) {
  const tags = (note.note_tags ?? []).slice(0, 4);
  const platformIcon = PLATFORM_ICONS[note.platform] ?? <Globe className="h-3.5 w-3.5 text-slate-400" />;
  const catColor = CATEGORY_COLORS[note.category ?? "Other"] ?? CATEGORY_COLORS.Other;
  const isProcessing = note.status !== "done" && note.status !== "failed";

  return (
    <Link href={`/note/${note.id}`}>
      <div className="group relative flex flex-col bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/5">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-slate-900 overflow-hidden">
          {note.thumbnail_url ? (
            <img
              src={note.thumbnail_url}
              alt={note.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-600">
              <Film className="h-12 w-12" />
            </div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center">
              <div className="text-center">
                <JobStatusBadge status={note.status} message={note.status_message} />
              </div>
            </div>
          )}
          {note.duration_seconds && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
              <Clock className="h-3 w-3" />
              {Math.floor(note.duration_seconds / 60)}:{String(note.duration_seconds % 60).padStart(2, "0")}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-white">
              {note.title || "Processing..."}
            </h3>
            <div className="shrink-0">{platformIcon}</div>
          </div>

          {note.summary && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {note.summary}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
            {note.status === "done" ? (
              <>
                {note.category && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${catColor}`}>
                    {note.category}
                  </span>
                )}
                {tags.map(({ tag }) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-xs bg-slate-700/50 text-slate-400"
                  >
                    {tag}
                  </span>
                ))}
              </>
            ) : (
              <JobStatusBadge status={note.status} message={note.status_message} />
            )}
          </div>

          <div className="text-xs text-slate-600 mt-1">
            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
          </div>
        </div>
      </div>
    </Link>
  );
}
