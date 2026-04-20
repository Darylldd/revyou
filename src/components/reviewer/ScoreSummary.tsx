"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, RotateCcw, Home, Star, Clock, Target, BookOpen, Flame, TrendingUp } from "lucide-react";
import type { SessionResult } from "@/app/review/page";
import type { User } from "@/types";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Props {
  result: SessionResult;
  reviewerTitle: string;
  onRestart: () => void;
  onNewSession: () => void;
  user: User | null;
  extractedText: string;
}

function getGrade(pct: number) {
  if (pct >= 90) return { label: "Mastered", sub: "You're ready for that exam.", color: "#d4890a", stars: 5 };
  if (pct >= 75) return { label: "Well Done", sub: "Almost there — review the misses.", color: "#d4890a", stars: 4 };
  if (pct >= 60) return { label: "Getting There", sub: "Another round and you'll nail it.", color: "#9e2424", stars: 3 };
  if (pct >= 45) return { label: "Keep Going", sub: "Don't stop — you're building up.", color: "#9e2424", stars: 2 };
  return { label: "Need More Time", sub: "Start with Easy mode to build foundation.", color: "#dc2626", stars: 1 };
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export default function ScoreSummary({ result, reviewerTitle, onRestart, user }: Props) {
  const { mode, difficulty, totalItems, correctAnswers, timeTaken } = result;
  const pct = totalItems > 0 ? Math.round((correctAnswers / totalItems) * 100) : 0;
  const grade = getGrade(pct);
  const [saved, setSaved] = useState(false);
  const isPanic = timeTaken < 300 && pct < 60;

  useEffect(() => {
    if (!user || saved) return;
    addDoc(collection(db, "reviewSessions"), {
      userId: user.uid, mode, difficulty, totalItems, correctAnswers, score: pct, timeTaken,
      createdAt: serverTimestamp(),
    }).then(() => setSaved(true)).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const modeLabel = mode === "flashcard" ? "Flashcards" : mode === "multiple-choice" ? "Multiple Choice" : "Combined";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: "var(--bg)" }}>
      {/* Ambient glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none"
        style={{ background: `radial-gradient(circle, ${pct >= 60 ? "rgba(212,137,10,0.07)" : "rgba(220,38,38,0.06)"} 0%, transparent 70%)` }} />

      <div className="w-full max-w-lg flex flex-col gap-5 relative z-10 animate-fade-up">
        {/* Trophy */}
        <div className="text-center">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isPanic ? "animate-glow-panic" : ""}`}
            style={{
              backgroundColor: pct >= 60 ? "rgba(212,137,10,0.12)" : "rgba(220,38,38,0.12)",
              border: `1px solid ${pct >= 60 ? "rgba(212,137,10,0.3)" : "rgba(220,38,38,0.3)"}`,
            }}>
            {isPanic ? <Flame size={36} style={{ color: "#dc2626" }} /> : <Trophy size={36} style={{ color: "var(--amber)" }} />}
          </div>

          {/* Stars */}
          <div className="flex justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={18}
                style={{ color: i < grade.stars ? "var(--amber)" : "var(--border-warm)", fill: i < grade.stars ? "var(--amber)" : "transparent", transition: "all 0.3s" }} />
            ))}
          </div>

          <h1 className="font-serif font-black text-4xl mb-1" style={{ color: grade.color }}>
            {grade.label}
          </h1>
          <p className="font-serif italic" style={{ color: "var(--text-muted)" }}>{grade.sub}</p>
          {reviewerTitle && (
            <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>{reviewerTitle}</p>
          )}
        </div>

        {/* Score card */}
        <div className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-warm)" }}>
          {/* Big number */}
          <div className="p-8 text-center border-b" style={{ borderColor: "var(--border)" }}>
            <p className="font-serif font-black leading-none mb-1"
              style={{
                fontSize: "5rem",
                color: pct >= 75 ? "var(--amber)" : pct >= 50 ? "var(--burgundy2)" : "var(--panic)",
                textShadow: pct >= 75 ? "0 0 40px rgba(212,137,10,0.3)" : "none",
              }}>
              {pct}%
            </p>
            <p className="font-serif italic" style={{ color: "var(--text-muted)" }}>
              {correctAnswers} out of {totalItems} correct
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 divide-x divide-y" style={{ borderColor: "var(--border)" }}>
            {[
              { icon: Target, label: "Mode", value: modeLabel, color: "var(--amber)", bg: "rgba(212,137,10,0.1)" },
              { icon: TrendingUp, label: "Difficulty", value: difficulty.charAt(0).toUpperCase() + difficulty.slice(1), color: difficulty === "easy" ? "#4ade80" : difficulty === "medium" ? "var(--amber)" : "var(--panic)", bg: difficulty === "easy" ? "rgba(74,222,128,0.1)" : difficulty === "medium" ? "rgba(212,137,10,0.1)" : "rgba(220,38,38,0.1)" },
              { icon: BookOpen, label: "Items", value: String(totalItems), color: "var(--burgundy2)", bg: "rgba(158,36,36,0.1)" },
              { icon: Clock, label: "Time", value: formatTime(timeTaken), color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
            ].map((s) => (
              <div key={s.label} className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: s.bg }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                  <p className="font-serif font-semibold text-sm" style={{ color: "var(--text)" }}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panic message */}
        {isPanic && (
          <div className="rounded-xl border p-4 flex items-start gap-3 animate-glow-panic"
            style={{ backgroundColor: "rgba(220,38,38,0.06)", borderColor: "rgba(220,38,38,0.3)" }}>
            <Flame size={16} style={{ color: "var(--panic)", marginTop: 2, flexShrink: 0 }} />
            <p className="text-sm font-serif italic" style={{ color: "#fca5a5" }}>
              The clock is ticking. Don&apos;t panic — pick your weakest topic and do one more round.
            </p>
          </div>
        )}

        {/* Normal message */}
        {!isPanic && (
          <div className="rounded-xl border p-4 flex items-start gap-3"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-warm)" }}>
            <BookOpen size={15} style={{ color: "var(--amber)", marginTop: 2, flexShrink: 0 }} />
            <p className="text-sm font-serif italic" style={{ color: "var(--text-muted)" }}>
              {pct >= 90 ? "The library is proud of you. You've earned a break."
                : pct >= 75 ? "One more session on your weak spots and you'll be exam-ready."
                : pct >= 60 ? "You're in the middle of the library stacks — keep going deeper."
                : "Light the lamp and go again. Every round builds memory."}
            </p>
          </div>
        )}

        {user && saved && (
          <p className="text-center text-xs font-serif italic" style={{ color: "var(--text-faint)" }}>
            ✓ Session saved to your library
          </p>
        )}
        {!user && (
          <p className="text-center text-xs" style={{ color: "var(--text-faint)" }}>
            <Link href="/signup" style={{ color: "var(--amber)" }}>Create an account</Link>
            {" "}to save your progress
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base transition-all active:scale-95"
            style={{ backgroundColor: "var(--amber)", color: "#080604", boxShadow: "0 4px 24px rgba(212,137,10,0.35)" }}>
            <RotateCcw size={16} />
            Study Again / Change Settings
          </button>
          <Link href={user ? "/dashboard" : "/"}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border font-semibold text-sm transition-all"
            style={{ borderColor: "var(--border-warm)", color: "var(--text-warm)", backgroundColor: "var(--surface)" }}>
            <Home size={15} />
            {user ? "Back to Library" : "Back to Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}