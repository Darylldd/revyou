"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, Zap, Clock, Library, ChevronRight, Flame } from "lucide-react";

const features = [
  {
    icon: Library,
    title: "Your Digital Library",
    desc: "Upload PDFs, notes, images — we extract everything just like a librarian would.",
    color: "#d4890a",
    bg: "rgba(212,137,10,0.1)",
  },
  {
    icon: BookOpen,
    title: "AI-Crafted Reviewers",
    desc: "LLaMA 3.3 70B generates flashcards and quizzes from your actual material.",
    color: "#9e2424",
    bg: "rgba(158,36,36,0.1)",
  },
  {
    icon: Zap,
    title: "Multiple Study Modes",
    desc: "Flashcards, multiple choice quizzes, or both combined for maximum retention.",
    color: "#d4890a",
    bg: "rgba(212,137,10,0.1)",
  },
  {
    icon: Clock,
    title: "5 Minutes to Go?",
    desc: "Cram mode hits the most critical topics fast. No fluff, just what matters.",
    color: "#dc2626",
    bg: "rgba(220,38,38,0.1)",
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
      {/* Ambient lamp glow at top */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(212,137,10,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Navbar */}
      <nav
        className="relative z-10 flex items-center justify-between px-6 py-4 border-b max-w-7xl mx-auto w-full"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center animate-flicker"
            style={{ backgroundColor: "rgba(212,137,10,0.15)", border: "1px solid rgba(212,137,10,0.3)" }}
          >
            <Flame size={16} style={{ color: "var(--amber)" }} />
          </div>
          <span
            className="font-serif font-bold text-xl tracking-wide"
            style={{ color: "var(--text)" }}
          >
            ReviewAI
          </span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-95"
              style={{
                backgroundColor: "var(--amber)",
                color: "#080604",
              }}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-95"
                style={{ backgroundColor: "var(--amber)", color: "#080604" }}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-24 animate-fade-up">
        {/* Panic badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-sm font-medium animate-glow-panic"
          style={{
            backgroundColor: "var(--panic-dim)",
            border: "1px solid rgba(220,38,38,0.35)",
            color: "#fca5a5",
          }}
        >
          <Clock size={13} />
          Exam tomorrow? We&apos;ve got you.
        </div>

        <h1
          className="font-serif font-black leading-none mb-6"
          style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)", color: "var(--text)" }}
        >
          Study Smarter.
          <br />
          <em
            style={{
              color: "var(--amber)",
              fontStyle: "italic",
              textShadow: "0 0 40px rgba(212,137,10,0.4)",
            }}
          >
            Panic Less.
          </em>
        </h1>

        <p
          className="text-lg md:text-xl max-w-2xl mb-10 leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          Upload your notes, textbook pages, or reviewer files. Our AI turns them into
          flashcards and quizzes — whether you have a week or{" "}
          <span style={{ color: "#fca5a5", fontWeight: 600 }}>5 minutes</span> left.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/review"
            className="flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 active:scale-95"
            style={{
              backgroundColor: "var(--amber)",
              color: "#080604",
              boxShadow: "0 4px 30px rgba(212,137,10,0.35)",
            }}
          >
            <Flame size={18} />
            Start Reviewing Now
            <ChevronRight size={18} />
          </Link>
          {!user && (
            <Link
              href="/signup"
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200"
              style={{
                border: "1px solid var(--border-warm)",
                color: "var(--text-warm)",
                backgroundColor: "var(--surface)",
              }}
            >
              Create Free Account
            </Link>
          )}
        </div>

        <p className="mt-5 text-sm" style={{ color: "var(--text-faint)" }}>
          No account needed to try &nbsp;·&nbsp; Sign in to save your library
        </p>
      </section>

      {/* The mood divider */}
      <div
        className="max-w-7xl mx-auto w-full px-6 py-2 flex items-center gap-4"
        style={{ color: "var(--text-faint)" }}
      >
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
        <span className="font-serif italic text-sm">
          It&apos;s 2am. The exam is at 8. Let&apos;s go.
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
      </div>

      {/* Features */}
      <section className="relative z-10 py-20 px-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="rounded-2xl p-6 flex flex-col gap-4 group hover:-translate-y-1 transition-all duration-300"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: f.bg, border: `1px solid ${f.color}30` }}
              >
                <f.icon size={20} style={{ color: f.color }} />
              </div>
              <div>
                <h3
                  className="font-serif font-semibold text-lg mb-1.5"
                  style={{ color: "var(--text)" }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-6 pb-20 max-w-6xl mx-auto w-full">
        <div
          className="rounded-2xl p-10 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{
            backgroundColor: "var(--surface2)",
            border: "1px solid var(--border-warm)",
            background: `linear-gradient(135deg, var(--surface2) 0%, rgba(124,29,29,0.15) 100%)`,
          }}
        >
          <div>
            <h2
              className="font-serif font-bold text-3xl mb-2"
              style={{ color: "var(--text)" }}
            >
              Your library. Your pace.
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              Save files, combine reviewers, track progress — all free.
            </p>
          </div>
          <Link
            href="/signup"
            className="flex-shrink-0 flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold transition-all active:scale-95"
            style={{
              backgroundColor: "var(--burgundy2)",
              color: "var(--text-warm)",
              border: "1px solid rgba(158,36,36,0.5)",
              boxShadow: "0 4px 20px rgba(124,29,29,0.3)",
            }}
          >
            <BookOpen size={16} />
            Open Your Library
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="text-center text-xs py-6 border-t"
        style={{
          borderColor: "var(--border)",
          color: "var(--text-faint)",
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
        }}
      >
        © {new Date().getFullYear()} ReviewAI — Forged at midnight, tested at dawn.
      </footer>
    </main>
  );
}