"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle, XCircle, BookOpen } from "lucide-react";
import type { Flashcard, DifficultyLevel } from "@/types";

interface FlashcardModeProps {
  flashcards: Flashcard[];
  difficulty: DifficultyLevel;
  onDone: (correct: number) => void;
  isCombinedPhase?: boolean;
  phaseLabel?: string;
}

const difficultyStyle: Record<DifficultyLevel, { color: string; bg: string }> = {
  easy:   { color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
  medium: { color: "#d4890a", bg: "rgba(212,137,10,0.1)" },
  hard:   { color: "#dc2626", bg: "rgba(220,38,38,0.1)" },
};

export default function FlashcardMode({ flashcards, difficulty, onDone, isCombinedPhase, phaseLabel }: FlashcardModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [results, setResults] = useState<("correct" | "incorrect" | null)[]>(() => new Array(flashcards.length).fill(null));
  const [isAnimating, setIsAnimating] = useState(false);

  const card = flashcards[currentIndex];
  const progress = (currentIndex / flashcards.length) * 100;
  const answered = results.filter((r) => r !== null).length;
  const isLast = currentIndex === flashcards.length - 1;
  const ds = difficultyStyle[difficulty];

  function flip() { if (!isAnimating) setIsFlipped((v) => !v); }

  function navigate(dir: "prev" | "next") {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((i) => dir === "next" ? Math.min(i + 1, flashcards.length - 1) : Math.max(i - 1, 0));
      setIsAnimating(false);
    }, 150);
  }

  function markAnswer(isCorrect: boolean) {
    const newResults = [...results];
    const prev = newResults[currentIndex];
    newResults[currentIndex] = isCorrect ? "correct" : "incorrect";
    let nc = correct;
    if (prev === "correct" && !isCorrect) nc--;
    else if (prev !== "correct" && isCorrect) nc++;
    else if (prev === null && isCorrect) nc++;
    setResults(newResults);
    setCorrect(nc);
    if (isLast) { setTimeout(() => onDone(nc), 400); }
    else { setTimeout(() => navigate("next"), 300); }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      {/* Top bar */}
      <div className="px-6 py-4 border-b flex items-center gap-4" style={{ borderColor: "var(--border)" }}>
        {isCombinedPhase && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full font-serif italic"
            style={{ backgroundColor: "rgba(212,137,10,0.15)", color: "var(--amber)" }}>
            {phaseLabel}
          </span>
        )}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-serif" style={{ color: "var(--text-muted)" }}>
            {currentIndex + 1} / {flashcards.length}
          </span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: "var(--amber)" }} />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
            style={{ backgroundColor: ds.bg, color: ds.color }}>
            {difficulty}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span style={{ color: "#4ade80" }}>✓ {correct}</span>
          <span style={{ color: "#f87171" }}>✗ {answered - correct}</span>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Lamp glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(212,137,10,0.06) 0%, transparent 70%)" }} />

        {results[currentIndex] && (
          <div className={`flex items-center gap-2 text-sm font-medium mb-4 px-3 py-1.5 rounded-full font-serif italic`}
            style={{
              color: results[currentIndex] === "correct" ? "#4ade80" : "#f87171",
              backgroundColor: results[currentIndex] === "correct" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
            }}>
            {results[currentIndex] === "correct" ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {results[currentIndex] === "correct" ? "Noted!" : "Keep studying"}
          </div>
        )}

        {/* Flashcard */}
        <div className="w-full max-w-xl cursor-pointer select-none relative z-10"
          style={{ perspective: "1200px" }} onClick={flip}>
          <div className="relative w-full transition-all duration-500"
            style={{ transformStyle: "preserve-3d", transform: isFlipped ? "rotateY(180deg)" : "rotateY(0)", minHeight: "280px" }}>
            {/* Front */}
            <div className="absolute inset-0 rounded-2xl p-8 flex flex-col items-center justify-center text-center"
              style={{
                backgroundColor: "var(--surface)",
                border: isFlipped ? "1px solid var(--border)" : "1px solid rgba(212,137,10,0.35)",
                boxShadow: isFlipped ? "none" : "0 0 40px rgba(212,137,10,0.08), inset 0 1px 0 rgba(212,137,10,0.1)",
                backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              }}>
              <BookOpen size={16} className="mb-4" style={{ color: "var(--text-faint)" }} />
              <p className="text-xs uppercase tracking-widest mb-4 font-sans font-semibold" style={{ color: "var(--text-faint)" }}>
                Question
              </p>
              <p className="font-serif text-xl font-semibold leading-relaxed" style={{ color: "var(--text)" }}>
                {card.question}
              </p>
              <p className="text-xs mt-6 font-serif italic" style={{ color: "var(--text-faint)" }}>
                Click to reveal answer
              </p>
            </div>

            {/* Back */}
            <div className="absolute inset-0 rounded-2xl p-8 flex flex-col items-center justify-center text-center"
              style={{
                backgroundColor: "var(--surface2)",
                border: "1px solid rgba(212,137,10,0.4)",
                boxShadow: "0 0 40px rgba(212,137,10,0.12)",
                backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}>
              <p className="text-xs uppercase tracking-widest mb-4 font-sans font-semibold" style={{ color: "var(--amber)" }}>
                Answer
              </p>
              <p className="font-serif text-xl font-semibold leading-relaxed" style={{ color: "var(--text)" }}>
                {card.answer}
              </p>
            </div>
          </div>
        </div>

        {/* Answer buttons */}
        {isFlipped && (
          <div className="flex gap-3 mt-6 w-full max-w-xl relative z-10">
            <button onClick={() => markAnswer(false)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all active:scale-95"
              style={{ borderColor: "rgba(248,113,113,0.3)", color: "#f87171", backgroundColor: "rgba(248,113,113,0.05)" }}>
              <XCircle size={16} /> Still Learning
            </button>
            <button onClick={() => markAnswer(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all active:scale-95"
              style={{ borderColor: "rgba(74,222,128,0.3)", color: "#4ade80", backgroundColor: "rgba(74,222,128,0.05)" }}>
              <CheckCircle size={16} /> Got It!
            </button>
          </div>
        )}

        {/* Nav dots */}
        <div className="flex items-center gap-4 mt-6 relative z-10">
          <button onClick={() => navigate("prev")} disabled={currentIndex === 0 || isAnimating}
            className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all disabled:opacity-30"
            style={{ borderColor: "var(--border-warm)", color: "var(--text-muted)", backgroundColor: "var(--surface)" }}>
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
            {flashcards.map((_, i) => (
              <button key={i} onClick={() => { if (isAnimating) return; setIsAnimating(true); setIsFlipped(false); setTimeout(() => { setCurrentIndex(i); setIsAnimating(false); }, 150); }}
                className="w-2 h-2 rounded-full transition-all duration-200"
                style={{
                  backgroundColor: i === currentIndex ? "var(--amber)" : results[i] === "correct" ? "#4ade80" : results[i] === "incorrect" ? "#f87171" : "var(--border)",
                  transform: i === currentIndex ? "scale(1.5)" : "scale(1)",
                }} />
            ))}
          </div>
          <button onClick={() => navigate("next")} disabled={currentIndex === flashcards.length - 1 || isAnimating}
            className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all disabled:opacity-30"
            style={{ borderColor: "var(--border-warm)", color: "var(--text-muted)", backgroundColor: "var(--surface)" }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Remaining hint */}
        {answered < flashcards.length && (
          <p className="text-xs mt-4 font-serif italic" style={{ color: "var(--text-faint)" }}>
            {flashcards.length - answered} card{flashcards.length - answered !== 1 ? "s" : ""} remaining — mark each before finishing
          </p>
        )}

        {answered === flashcards.length && (
          <button onClick={() => onDone(correct)}
            className="mt-6 flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
            style={{ backgroundColor: "var(--amber)", color: "#080604", boxShadow: "0 4px 20px rgba(212,137,10,0.35)" }}>
            <RotateCcw size={15} />
            {isCombinedPhase ? "Next Phase →" : "See Results"}
          </button>
        )}
      </div>
    </div>
  );
}