"use client";

import { NoteStatus } from "@/types";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

const STATUS_CONFIG: Record<
  NoteStatus,
  { label: string; color: string; icon: React.ReactNode; pulse: boolean }
> = {
  pending: {
    label: "Queued",
    color: "text-slate-400 bg-slate-400/10 border-slate-400/20",
    icon: <Clock className="h-3 w-3" />,
    pulse: false,
  },
  downloading: {
    label: "Downloading",
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    pulse: true,
  },
  extracting: {
    label: "Extracting",
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    pulse: true,
  },
  transcribing: {
    label: "Transcribing",
    color: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    pulse: true,
  },
  analyzing: {
    label: "Analyzing",
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    pulse: true,
  },
  embedding: {
    label: "Indexing",
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    pulse: true,
  },
  researching: {
    label: "Researching",
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    pulse: true,
  },
  summarizing: {
    label: "Summarizing",
    color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    pulse: true,
  },
  done: {
    label: "Ready",
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    icon: <CheckCircle className="h-3 w-3" />,
    pulse: false,
  },
  failed: {
    label: "Failed",
    color: "text-red-400 bg-red-400/10 border-red-400/20",
    icon: <XCircle className="h-3 w-3" />,
    pulse: false,
  },
};

interface Props {
  status: NoteStatus;
  message?: string | null;
}

export default function JobStatusBadge({ status, message }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}
      >
        {config.icon}
        {config.label}
      </span>
      {message && config.pulse && (
        <span className="text-xs text-slate-500 truncate max-w-[180px]">{message}</span>
      )}
    </div>
  );
}
