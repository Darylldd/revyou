"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw, Home } from "lucide-react";
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

function grade(pct: number) {
  if (pct >= 90) return { label: "mastered it", note: "You're ready. Close the books.", stars: 5, color: "#16a34a" };
  if (pct >= 75) return { label: "well done", note: "Review the ones you missed once more.", stars: 4, color: "#16a34a" };
  if (pct >= 60) return { label: "getting there", note: "One more round and you'll be solid.", stars: 3, color: "#d97706" };
  if (pct >= 45) return { label: "keep going", note: "Don't stop — you're building up.", stars: 2, color: "#d97706" };
  return { label: "needs work", note: "Try Easy mode to build the foundation first.", stars: 1, color: "#dc2626" };
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export default function ScoreSummary({ result, reviewerTitle, onRestart, user }: Props) {
  const { mode, difficulty, totalItems, correctAnswers, timeTaken } = result;
  const pct = totalItems > 0 ? Math.round((correctAnswers / totalItems) * 100) : 0;
  const g = grade(pct);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || saved) return;
    addDoc(collection(db, "reviewSessions"), {
      userId: user.uid, mode, difficulty, totalItems, correctAnswers, score: pct, timeTaken, createdAt: serverTimestamp(),
    }).then(() => setSaved(true)).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const modeLabel = mode === "flashcard" ? "Flashcards" : mode === "multiple-choice" ? "Quiz" : "Combined";

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Main score card — ruled paper with tape */}
        <div className="ruled tape" style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderLeft: "3px solid var(--rule-red)",
          borderRadius: 3, padding: "32px 28px",
          boxShadow: "3px 5px 0 var(--border-2)",
          position: "relative",
        }} >
          {/* Stars */}
          <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
            {[1,2,3,4,5].map((i) => (
              <span key={i} style={{ fontSize: 18, color: i <= g.stars ? "#d97706" : "var(--border-2)" }}>★</span>
            ))}
          </div>

          {/* Big score */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
            <span className="hand" style={{ fontSize: 72, fontWeight: 700, lineHeight: 1, color: g.color }}>{pct}</span>
            <span className="hand" style={{ fontSize: 28, color: "var(--ink-3)" }}>%</span>
          </div>

          <p className="hand" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{g.label}</p>
          <p style={{ fontSize: 13, color: "var(--ink-3)", fontStyle: "italic", marginBottom: 16 }}>{g.note}</p>
          {reviewerTitle && <p style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 8 }}>{reviewerTitle}</p>}

          {/* Stats — looks like a written table */}
          <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
            {[
              { label: "score", val: `${correctAnswers} / ${totalItems}` },
              { label: "mode", val: modeLabel },
              { label: "difficulty", val: difficulty },
              { label: "time", val: fmtTime(timeTaken) },
            ].map((s) => (
              <div key={s.label}>
                <p style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 1 }}>{s.label}</p>
                <p className="hand" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-2)" }}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky note — margin annotation style */}
        <div style={{
          background: "#fef9c3", border: "1px solid #f0e060", borderRadius: 2,
          padding: "14px 16px", transform: "rotate(0.4deg)",
          boxShadow: "2px 3px 0 #e6d640",
        }}>
          <p className="hand" style={{ fontSize: 15, color: "var(--ink-2)" }}>
            {pct >= 90 ? "Perfect score! Well earned break."
  : pct >= 75 ? "Almost perfect. Review the ones you missed."
  : pct >= 60 ? "Decent start. One more round will lock it in."
  : "Don't worry! Study, sleep, repeat."}
          </p>
        </div>

        {user && saved && <p style={{ textAlign: "center", fontSize: 11, color: "var(--ink-4)", fontStyle: "italic" }}>✓ session saved to your account</p>}
        {!user && <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-4)" }}><Link href="/signup" style={{ color: "var(--blue)" }}>create an account</Link> to track your progress</p>}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onRestart} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: "var(--blue)", color: "#fff", border: "none",
            borderRadius: 4, padding: "12px", fontSize: 15, fontWeight: 700,
            cursor: "pointer", fontFamily: "var(--font-hand)",
            boxShadow: "3px 4px 0 rgba(37,99,235,0.25)",
          }}>
            <RotateCcw size={15} /> try again / change settings
          </button>
          <Link href={user ? "/dashboard" : "/"} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: "var(--card)", color: "var(--ink-2)",
            border: "1.5px solid var(--border)", borderRadius: 4, padding: "11px",
            fontSize: 14, fontWeight: 600, textDecoration: "none",
            boxShadow: "2px 3px 0 var(--border-2)",
          }}>
            <Home size={14} /> {user ? "back to my desk" : "back home"}
          </Link>
        </div>
      </div>
    </div>
  );
}