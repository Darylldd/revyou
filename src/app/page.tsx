"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Brain, Zap, Shield, Upload, ChevronRight, Sparkles } from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Upload Any File",
    desc: "PDF, images, Word docs — we extract the content automatically.",
  },
  {
    icon: Brain,
    title: "AI-Powered Reviewer",
    desc: "Claude AI intelligently generates flashcards and quizzes from your material.",
  },
  {
    icon: Zap,
    title: "Multiple Modes",
    desc: "Study via flashcards or challenge yourself with multiple-choice quizzes.",
  },
  {
    icon: Shield,
    title: "Save & Combine",
    desc: "Sign in to save your reviewers and merge them into one master reviewer.",
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      {/* Navbar */}
      <nav
        className="flex items-center justify-between px-6 py-4 border-b max-w-7xl mx-auto w-full"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="text-violet-400 w-6 h-6" />
          <span className="text-white font-bold text-xl">ReviewAI</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 active:scale-95"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hover:bg-white/5 text-slate-300 hover:text-white px-4 py-2 rounded-lg transition-all duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 active:scale-95"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border"
          style={{
            backgroundColor: "rgba(124,58,237,0.1)",
            borderColor: "rgba(124,58,237,0.2)",
          }}
        >
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-violet-300 text-sm font-medium">Powered by Claude AI</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Study Smarter,
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-300">
            Not Harder
          </span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-10">
          Upload your reviewer files and let AI instantly generate flashcards and quizzes
          tailored to your difficulty level. No signup required to try.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/review"
            className="bg-violet-600 hover:bg-violet-700 text-white font-semibold flex items-center gap-2 text-lg px-8 py-3 rounded-xl transition-all duration-200 active:scale-95"
          >
            Start Reviewing Free
            <ChevronRight className="w-5 h-5" />
          </Link>
          {!user && (
            <Link
              href="/signup"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-2 text-lg px-8 py-3 rounded-xl border border-white/10 transition-all duration-200 active:scale-95"
            >
              Create Account
            </Link>
          )}
        </div>

        <p className="text-slate-500 text-sm mt-4">
          No account needed to try • Sign in to save your progress
        </p>
      </section>

      {/* Features */}
      <section className="py-20 px-6 max-w-6xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-center text-white mb-12">
          Everything you need to ace your exams
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl p-6 border transition-colors hover:border-violet-500/40"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <f.icon className="text-violet-400 w-8 h-8 mb-4" />
              <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="text-center text-sm py-6 border-t"
        style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
      >
        © {new Date().getFullYear()} ReviewAI — Built with Next.js, Firebase & Claude AI
      </footer>
    </main>
  );
}