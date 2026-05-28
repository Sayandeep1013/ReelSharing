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
      <p className="text-[#8A8580] text-sm font-bold uppercase tracking-wider">
        No key frames were captured for this video.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {withImages.map((frame) => (
          <div
            key={frame.frame_index}
            className="group relative border-2 border-[#1C1C1C] overflow-hidden aspect-video cursor-pointer hover:shadow-[4px_4px_0px_#1C1C1C] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all"
            onClick={() => setLightbox(frame)}
          >
            <img
              src={frame.public_url!}
              alt={`Frame at ${formatTime(frame.timestamp_seconds)}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <div className="absolute inset-0 bg-[#1C1C1C]/0 group-hover:bg-[#1C1C1C]/40 transition-colors flex items-center justify-center">
              <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute bottom-0 left-0 px-2 py-0.5 bg-[#1C1C1C] text-[#F0EDE6] text-[10px] font-black tracking-wider">
              {formatTime(frame.timestamp_seconds)}
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-[#1C1C1C]/95 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 border-2 border-white/30 text-white/70 hover:text-white hover:border-white transition"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.public_url!} alt="Key frame" className="w-full border-2 border-white/20" />
            <div className="mt-4 space-y-2">
              <span className="inline-block px-2 py-0.5 bg-[#E85234] text-white text-[10px] font-black uppercase tracking-widest border-2 border-white/20">
                {formatTime(lightbox.timestamp_seconds)}
              </span>
              {lightbox.description && (
                <p className="text-white/80 text-sm leading-relaxed">{lightbox.description}</p>
              )}
              {lightbox.ocr_text && (
                <p className="text-white/40 text-xs font-mono mt-2">OCR: {lightbox.ocr_text}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
