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
      toast.success("Video queued for processing! You can keep using the app.");
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
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("url")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            mode === "url"
              ? "bg-cyan-500 text-slate-900"
              : "text-slate-400 hover:text-white hover:bg-slate-700"
          }`}
        >
          <Link2 className="h-3.5 w-3.5" />
          Paste URL
        </button>
        <button
          onClick={() => setMode("file")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            mode === "file"
              ? "bg-cyan-500 text-slate-900"
              : "text-slate-400 hover:text-white hover:bg-slate-700"
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload File
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        {mode === "url" ? (
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or Instagram, TikTok..."
            className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
            disabled={loading}
          />
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-sm text-slate-400 hover:text-white hover:border-cyan-500 transition text-left"
            >
              {file ? (
                <span className="text-white">{file.name}</span>
              ) : (
                "Choose MP4, MOV, WebM, or AVI (max 3 min)"
              )}
            </button>
            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-slate-500 hover:text-red-400"
              >
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
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm transition disabled:opacity-60 flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Process"
          )}
        </button>
      </form>

      <p className="text-xs text-slate-500 mt-2">
        Max 3 minutes. Supports YouTube, Instagram Reels, TikTok, Twitter/X, and direct upload.
        Processing runs in the background — you can keep using the app.
      </p>
    </div>
  );
}
