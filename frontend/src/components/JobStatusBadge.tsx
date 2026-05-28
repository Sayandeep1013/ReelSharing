"use client";

import { NoteStatus } from "@/types";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

const STATUS_CONFIG: Record<
  NoteStatus,
  { label: string; style: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Queued",
    style: "border-[#1C1C1C] text-[#6B6560] bg-[#E8E4DC]",
    icon: <Clock className="h-3 w-3" />,
  },
  downloading: {
    label: "Downloading",
    style: "border-[#E85234] text-[#E85234] bg-[#E85234]/10",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  extracting: {
    label: "Extracting",
    style: "border-[#E85234] text-[#E85234] bg-[#E85234]/10",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  transcribing: {
    label: "Transcribing",
    style: "border-[#E85234] text-[#E85234] bg-[#E85234]/10",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  analyzing: {
    label: "Analyzing",
    style: "border-[#E85234] text-[#E85234] bg-[#E85234]/10",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  embedding: {
    label: "Indexing",
    style: "border-[#E85234] text-[#E85234] bg-[#E85234]/10",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  researching: {
    label: "Researching",
    style: "border-[#E85234] text-[#E85234] bg-[#E85234]/10",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  summarizing: {
    label: "Summarizing",
    style: "border-[#E85234] text-[#E85234] bg-[#E85234]/10",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  done: {
    label: "Ready",
    style: "border-[#1C1C1C] text-[#F0EDE6] bg-[#1C1C1C]",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  failed: {
    label: "Failed",
    style: "border-red-600 text-red-600 bg-red-50",
    icon: <XCircle className="h-3 w-3" />,
  },
};

interface Props {
  status: NoteStatus;
  message?: string | null;
}

export default function JobStatusBadge({ status, message }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const isActive = !["done", "failed", "pending"].includes(status);

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border-2 text-[10px] font-black uppercase tracking-widest ${config.style}`}>
        {config.icon}
        {config.label}
      </span>
      {message && isActive && (
        <span className="text-[11px] text-[#6B6560] truncate max-w-[200px]">{message}</span>
      )}
    </div>
  );
}
