"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Brain, Video, Search, Zap, BookOpen, Tag } from "lucide-react";

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error("Sign-in failed: " + error.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-cyan-400" />
          <span className="font-bold text-lg tracking-tight">ReelSharing</span>
        </div>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition disabled:opacity-60"
        >
          {loading ? "Redirecting..." : "Sign in"}
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-sm mb-6">
          <Zap className="h-3.5 w-3.5" />
          AI-powered video memory
        </div>
        <h1 className="text-5xl font-bold tracking-tight leading-tight mb-6">
          Never lose a useful video again.
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Paste any video link — YouTube, Instagram Reels, TikTok, or upload your own.
          Get a structured knowledge note with AI summary, full transcript, key frames,
          and research links. Instantly searchable.
        </p>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-lg transition disabled:opacity-60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? "Signing in..." : "Continue with Google"}
        </button>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Video,
              title: "Paste any link",
              desc: "YouTube, Instagram Reels, TikTok, Twitter/X, or upload an MP4/MOV directly. Max 3 minutes.",
            },
            {
              icon: Brain,
              title: "AI does the work",
              desc: "Transcription, visual frame analysis, category detection, key moment extraction — all automatic.",
            },
            {
              icon: Search,
              title: "Search your vault",
              desc: "Find any note by title, tags, category, or semantic meaning. Your video library becomes a knowledge base.",
            },
            {
              icon: BookOpen,
              title: "Structured notes",
              desc: "Summary, key points, transcript with timestamps, key frames, resources, and review questions.",
            },
            {
              icon: Tag,
              title: "Smart tagging",
              desc: "AI assigns categories and tags automatically. You can edit, add, or remove any of them.",
            },
            {
              icon: Zap,
              title: "Non-blocking queue",
              desc: "Submit a link and keep browsing. Processing happens in the background and notifies you when done.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50"
            >
              <Icon className="h-5 w-5 text-cyan-400 mb-3" />
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
