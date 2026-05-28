"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Brain, Video, Search, Zap, BookOpen, Tag } from "lucide-react";

const FEATURES = [
  {
    icon: Video,
    label: "01",
    title: "Paste Any Link",
    desc: "YouTube, Instagram Reels, TikTok, Twitter/X, or upload an MP4/MOV. Max 3 minutes.",
  },
  {
    icon: Brain,
    label: "02",
    title: "AI Does The Work",
    desc: "Transcription, visual frame analysis, category detection, key moment extraction — all automatic.",
  },
  {
    icon: Search,
    label: "03",
    title: "Search Your Vault",
    desc: "Find any note by title, tags, category, or semantic meaning. Your video library becomes a knowledge base.",
  },
  {
    icon: BookOpen,
    label: "04",
    title: "Structured Notes",
    desc: "Summary, key points, transcript with timestamps, key frames, resources, and review questions.",
  },
  {
    icon: Tag,
    label: "05",
    title: "Smart Tagging",
    desc: "AI assigns categories and tags automatically. You can edit, add, or remove any of them.",
  },
  {
    icon: Zap,
    label: "06",
    title: "Non-Blocking Queue",
    desc: "Submit a link and keep browsing. Processing runs in the background and notifies you when done.",
  },
];

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast.error("Sign-in failed: " + error.message);
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen text-[#1C1C1C]"
      style={{
        backgroundColor: "#F0EDE6",
        backgroundImage:
          "linear-gradient(rgba(28,28,28,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(28,28,28,0.055) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-[#E85234]" />
          <span className="font-black text-[11px] tracking-[0.22em] uppercase">ReelSharing</span>
        </div>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="px-5 py-2 text-[11px] font-black uppercase tracking-widest border-2 border-[#1C1C1C] bg-transparent hover:bg-[#1C1C1C] hover:text-[#F0EDE6] transition-colors disabled:opacity-60"
        >
          {loading ? "Redirecting..." : "Sign In"}
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-[#1C1C1C] text-[10px] font-black uppercase tracking-[0.22em] mb-10">
          <span className="w-2 h-2 rounded-full bg-[#E85234]" />
          AI-Powered Video Memory Vault
        </div>

        <h1 className="font-black leading-[0.9] tracking-tight uppercase mb-10"
          style={{ fontSize: "clamp(3.2rem, 10vw, 8.5rem)" }}>
          Never Lose<br />
          A Useful<br />
          <span className="text-[#E85234]">Video</span><br />
          Again.
        </h1>

        <div className="flex flex-col sm:flex-row items-start gap-8">
          <p className="text-[#6B6560] max-w-xs leading-relaxed text-sm">
            Paste any video link or upload your own. Get a structured knowledge note
            with AI summary, full transcript, key frames, and research links.
            Instantly searchable.
          </p>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="shrink-0 inline-flex items-center gap-3 px-7 py-4 bg-[#E85234] text-white font-black uppercase tracking-wider text-[11px] border-2 border-[#1C1C1C] shadow-[5px_5px_0px_#1C1C1C] hover:shadow-[2px_2px_0px_#1C1C1C] hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-60"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading ? "Signing In..." : "Continue With Google"}
          </button>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-[#1C1C1C]/20" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8A8580]">What It Does</span>
          <div className="h-px flex-1 bg-[#1C1C1C]/20" />
        </div>
      </div>

      {/* Features grid — border-top+left on container, border-right+bottom on each cell */}
      <section className="max-w-6xl mx-auto px-6 py-10 pb-24">
        <div className="border-t-2 border-l-2 border-[#1C1C1C] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, label, title, desc }) => (
            <div
              key={title}
              className="border-r-2 border-b-2 border-[#1C1C1C] p-8 flex flex-col gap-3 bg-[#F0EDE6]/60"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="w-9 h-9 bg-[#E85234] border-2 border-[#1C1C1C] flex items-center justify-center">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-[11px] font-black text-[#C4BFB8] tracking-widest">{label}</span>
              </div>
              <h3 className="font-black uppercase text-[11px] tracking-widest">{title}</h3>
              <p className="text-[#6B6560] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
