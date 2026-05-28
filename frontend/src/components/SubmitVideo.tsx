"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Link2, Upload, X, Loader2 } from "lucide-react";
import { submitUrl, submitUpload } from "@/lib/api";

interface Props {
  token: string;
  onSubmitted: (noteId: string) => void;
}

export default function SubmitVideo({ token, onSubmitted }: Props) {
  const [mode, setMode] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      let result;
      if (mode === "url") {
        if (!url.trim()) return toast.error("Please enter a video URL");
        result = await submitUrl(token, url.trim());
      } else {
        if (!file) return toast.error("Please select a video file");
        result = await submitUpload(token, file);
      }
      toast.success("Video queued! You can keep using the app.");
      setUrl("");
      setFile(null);
      onSubmitted(result.note_id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-2 border-[#1C1C1C] bg-[#E8E4DC] p-5">
      {/* Mode tabs */}
      <div className="flex border-b-2 border-[#1C1C1C] mb-5 -mx-5 px-5">
        {(["url", "file"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest border-r-2 border-[#1C1C1C] transition-colors ${
              mode === m
                ? "bg-[#E85234] text-white"
                : "bg-transparent text-[#6B6560] hover:text-[#1C1C1C]"
            }`}
          >
            {m === "url" ? <Link2 className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
            {m === "url" ? "Paste URL" : "Upload File"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        {mode === "url" ? (
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=...  or Instagram, TikTok..."
            className="flex-1 px-3 py-2.5 border-2 border-[#1C1C1C] bg-[#F0EDE6] text-[#1C1C1C] text-sm placeholder-[#8A8580] focus:outline-none focus:border-[#E85234]"
            disabled={loading}
          />
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 px-3 py-2.5 border-2 border-[#1C1C1C] bg-[#F0EDE6] text-sm text-[#8A8580] hover:border-[#E85234] transition text-left"
            >
              {file ? (
                <span className="text-[#1C1C1C] font-bold">{file.name}</span>
              ) : (
                "Choose MP4, MOV, WebM, or AVI (max 3 min)"
              )}
            </button>
            {file && (
              <button type="button" onClick={() => setFile(null)} className="text-[#6B6560] hover:text-[#E85234] transition">
                <X className="h-4 w-4" />
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".mp4,.mov,.webm,.avi,video/mp4,video/quicktime,video/webm,video/x-msvideo"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-[#E85234] text-white text-[11px] font-black uppercase tracking-widest border-2 border-[#1C1C1C] shadow-[4px_4px_0px_#1C1C1C] hover:shadow-[2px_2px_0px_#1C1C1C] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-60 flex items-center gap-2"
        >
          {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...</> : "Process"}
        </button>
      </form>

      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A8580] mt-4">
        Max 3 min · YouTube · Instagram Reels · TikTok · Twitter/X · Direct Upload — Runs in background
      </p>
    </div>
  );
}
