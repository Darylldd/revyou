"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import type { Flashcard, DifficultyLevel } from "@/types";

interface Props {
  flashcards: Flashcard[];
  difficulty: DifficultyLevel;
  onDone: (correct: number) => void;
  isCombinedPhase?: boolean;
  phaseLabel?: string;
}

const diffColor: Record<DifficultyLevel, string> = {
  easy: "#16a34a", medium: "#d97706", hard: "#dc2626",
};

export default function FlashcardMode({ flashcards, difficulty, onDone, isCombinedPhase, phaseLabel }: Props) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [results, setResults] = useState<("correct" | "incorrect" | null)[]>(() => new Array(flashcards.length).fill(null));
  const [anim, setAnim] = useState(false);

  const card = flashcards[idx];
  const answered = results.filter(Boolean).length;
  const isLast = idx === flashcards.length - 1;
  const progress = Math.round((answered / flashcards.length) * 100);

  function go(dir: "prev" | "next") {
    if (anim) return;
    setAnim(true); setFlipped(false);
    setTimeout(() => { setIdx((i) => dir === "next" ? Math.min(i + 1, flashcards.length - 1) : Math.max(i - 1, 0)); setAnim(false); }, 140);
  }

  function mark(isCorrect: boolean) {
    const nr = [...results];
    const prev = nr[idx];
    nr[idx] = isCorrect ? "correct" : "incorrect";
    let nc = correct;
    if (prev === "correct" && !isCorrect) nc--;
    else if (prev !== "correct" && isCorrect) nc++;
    else if (prev === null && isCorrect) nc++;
    setResults(nr); setCorrect(nc);
    if (!isLast) setTimeout(() => go("next"), 280);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>

      {/* Progress bar — looks like pencil underlining */}
      <div style={{ background: "var(--card)", borderBottom: "1.5px solid var(--border)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        {isCombinedPhase && <span className="hand" style={{ fontSize: 13, color: "var(--blue)", whiteSpace: "nowrap" }}>{phaseLabel}</span>}
        <span style={{ fontSize: 12, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{idx + 1} / {flashcards.length}</span>
        <div style={{ flex: 1, height: 4, background: "var(--border-2)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: diffColor[difficulty], borderRadius: 2, transition: "width .4s" }} />
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: 13, fontWeight: 600 }}>
          <span style={{ color: "#16a34a" }}>✓ {correct}</span>
          <span style={{ color: "#dc2626" }}>✗ {answered - correct}</span>
        </div>
      </div>

      {/* Card area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>

        {results[idx] && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
            marginBottom: 12, padding: "5px 12px", borderRadius: 20,
            background: results[idx] === "correct" ? "var(--green-light)" : "var(--red-light)",
            color: results[idx] === "correct" ? "#16a34a" : "#dc2626",
          }}>
            {results[idx] === "correct" ? <CheckCircle size={14} /> : <XCircle size={14} />}
            <span className="hand">{results[idx] === "correct" ? "got it!" : "keep studying"}</span>
          </div>
        )}

        {/* The actual flashcard — ruled index card */}
        <div style={{ width: "100%", maxWidth: 520, cursor: "pointer", perspective: 1000 }} onClick={() => !anim && setFlipped((v) => !v)}>
          <div style={{
            position: "relative", width: "100%", minHeight: 260,
            transition: "transform 0.5s",
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}>
            {/* Front */}
            <div className="ruled" style={{
              position: "absolute", inset: 0,
              border: `1px solid ${flipped ? "var(--border)" : diffColor[difficulty]}`,
              borderRadius: 3, padding: "32px 28px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
              backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              boxShadow: flipped ? "none" : "3px 4px 0 var(--border-2)",
              background: "var(--card)",
            }}>
              <div style={{ borderLeft: "2px solid var(--rule-red)", paddingLeft: 16, width: "100%" }}>
                <p style={{ fontSize: 11, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>question</p>
                <p style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)", lineHeight: 1.6 }}>{card.question}</p>
                <p style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 16, fontStyle: "italic" }}>click to flip</p>
              </div>
            </div>

            {/* Back */}
            <div className="ruled" style={{
              position: "absolute", inset: 0,
              border: `1px solid ${diffColor[difficulty]}`,
              borderRadius: 3, padding: "32px 28px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
              backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              boxShadow: "3px 4px 0 var(--border-2)",
              background: "var(--sticky-b)",
            }}>
              <p className="hand" style={{ fontSize: 13, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 700 }}>answer</p>
              <p style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)", lineHeight: 1.6 }}>{card.answer}</p>
            </div>
          </div>
        </div>

        {/* Mark buttons */}
        {flipped && (
          <div style={{ display: "flex", gap: 10, marginTop: 16, width: "100%", maxWidth: 520 }}>
            <button onClick={() => mark(false)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px", borderRadius: 4,
              background: "var(--red-light)", color: "var(--red)",
              border: "1.5px solid #fca5a5", cursor: "pointer", fontWeight: 600, fontSize: 14,
              fontFamily: "var(--font-hand)",
            }}>
              <XCircle size={16} /> still learning
            </button>
            <button onClick={() => mark(true)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px", borderRadius: 4,
              background: "var(--green-light)", color: "var(--green)",
              border: "1.5px solid #86efac", cursor: "pointer", fontWeight: 600, fontSize: 14,
              fontFamily: "var(--font-hand)",
            }}>
              <CheckCircle size={16} /> got it!
            </button>
          </div>
        )}

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <button onClick={() => go("prev")} disabled={idx === 0 || anim} style={{
            width: 36, height: 36, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--card)", border: "1.5px solid var(--border)", cursor: "pointer", color: "var(--ink-3)",
            opacity: idx === 0 ? 0.3 : 1,
          }}>
            <ChevronLeft size={16} />
          </button>

          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", maxWidth: 280 }}>
            {flashcards.map((_, i) => (
              <div key={i} onClick={() => { if (anim) return; setAnim(true); setFlipped(false); setTimeout(() => { setIdx(i); setAnim(false); }, 140); }}
                style={{
                  width: 8, height: 8, borderRadius: "50%", cursor: "pointer",
                  background: i === idx ? diffColor[difficulty] : results[i] === "correct" ? "#16a34a" : results[i] === "incorrect" ? "#dc2626" : "var(--border-2)",
                  transform: i === idx ? "scale(1.5)" : "scale(1)",
                  transition: "all .2s",
                }} />
            ))}
          </div>

          <button onClick={() => go("next")} disabled={isLast || anim} style={{
            width: 36, height: 36, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--card)", border: "1.5px solid var(--border)", cursor: "pointer", color: "var(--ink-3)",
            opacity: isLast ? 0.3 : 1,
          }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Status */}
        {answered < flashcards.length ? (
          <p style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 12, fontStyle: "italic" }}>
            {flashcards.length - answered} card{flashcards.length - answered !== 1 ? "s" : ""} left — mark each one to finish
          </p>
        ) : (
          <button onClick={() => onDone(correct)} style={{
            marginTop: 16, display: "flex", alignItems: "center", gap: 6,
            padding: "10px 24px", borderRadius: 4,
            background: "var(--blue)", color: "#fff",
            border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700,
            fontFamily: "var(--font-hand)",
            boxShadow: "3px 4px 0 rgba(37,99,235,0.25)",
          }}>
            <RotateCcw size={15} />
            {isCombinedPhase ? "next phase →" : "see results"}
          </button>
        )}
      </div>
    </div>
  );
}