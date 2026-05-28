"use client";

import { useState } from "react";
import { NoteFrame } from "@/types";
import { X, ZoomIn } from "lucide-react";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  frames: NoteFrame[];
}

export default function KeyFrameGallery({ frames }: Props) {
  const [lightbox, setLightbox] = useState<NoteFrame | null>(null);

  const withImages = frames.filter((f) => f.public_url);

  if (!withImages.length) {
    return (
      <p className="text-slate-500 text-sm italic">No key frames were captured for this video.</p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {withImages.map((frame) => (
          <div
            key={frame.frame_index}
            className="group relative rounded-lg overflow-hidden bg-slate-900 aspect-video cursor-pointer"
            onClick={() => setLightbox(frame)}
          >
            <img
              src={frame.public_url!}
              alt={`Frame at ${formatTime(frame.timestamp_seconds)}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs font-mono">
              {formatTime(frame.timestamp_seconds)}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition"
            onClick={() => setLightbox(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.public_url!}
              alt="Key frame"
              className="w-full rounded-xl"
            />
            <div className="mt-3 space-y-1">
              <p className="text-cyan-400 text-sm font-mono">
                {formatTime(lightbox.timestamp_seconds)}
              </p>
              {lightbox.description && (
                <p className="text-slate-300 text-sm leading-relaxed">
                  {lightbox.description}
                </p>
              )}
              {lightbox.ocr_text && (
                <p className="text-slate-500 text-xs font-mono mt-2">
                  OCR: {lightbox.ocr_text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
