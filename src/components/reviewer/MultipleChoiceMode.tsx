"use client";

import { useState } from "react";
import { CheckCircle, XCircle, ChevronRight, Lightbulb, RotateCcw } from "lucide-react";
import type { MultipleChoiceQuestion, DifficultyLevel } from "@/types";

interface Props {
  questions: MultipleChoiceQuestion[];
  difficulty: DifficultyLevel;
  onDone: (correct: number) => void;
  isCombinedPhase?: boolean;
  phaseLabel?: string;
}

const LABELS = ["A", "B", "C", "D"];

const difficultyStyle: Record<DifficultyLevel, { color: string; bg: string }> = {
  easy:   { color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
  medium: { color: "#d4890a", bg: "rgba(212,137,10,0.1)" },
  hard:   { color: "#dc2626", bg: "rgba(220,38,38,0.1)" },
};

export default function MultipleChoiceMode({ questions, difficulty, onDone, isCombinedPhase, phaseLabel }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => new Array(questions.length).fill(null));
  const [transitioning, setTransitioning] = useState(false);

  const q = questions[currentIndex];
  const isAnswered = selected !== null;
  const isCorrect = selected === q.correctIndex;
  const progress = ((currentIndex) / questions.length) * 100;
  const isLast = currentIndex === questions.length - 1;
  const answeredCount = answers.filter((a) => a !== null).length;
  const ds = difficultyStyle[difficulty];

  function handleSelect(i: number) {
    if (isAnswered || transitioning) return;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = i;
    setAnswers(newAnswers);
    setSelected(i);
    if (i === q.correctIndex) setCorrect((c) => c + 1);
  }

  function handleNext() {
    if (transitioning) return;
    if (isLast) { onDone(correct); return; }
    setTransitioning(true);
    setShowExp(false);
    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setTransitioning(false);
    }, 200);
  }

  function choiceStyle(idx: number): React.CSSProperties {
    if (!isAnswered) return { backgroundColor: "var(--surface2)", borderColor: "var(--border-warm)" };
    if (idx === q.correctIndex) return { backgroundColor: "rgba(74,222,128,0.08)", borderColor: "rgba(74,222,128,0.4)" };
    if (idx === selected) return { backgroundColor: "rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.4)" };
    return { backgroundColor: "rgba(255,255,255,0.02)", borderColor: "var(--border)" };
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center gap-4" style={{ borderColor: "var(--border)" }}>
        {isCombinedPhase && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full font-serif italic"
            style={{ backgroundColor: "rgba(212,137,10,0.12)", color: "var(--amber)" }}>
            {phaseLabel}
          </span>
        )}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-serif" style={{ color: "var(--text-muted)" }}>
            {currentIndex + 1} / {questions.length}
          </span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress + (100 / questions.length)}%`, backgroundColor: "var(--burgundy2)" }} />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
            style={{ backgroundColor: ds.bg, color: ds.color }}>
            {difficulty}
          </span>
        </div>
        <div className="flex gap-3 text-sm font-semibold">
          <span style={{ color: "#4ade80" }}>✓ {correct}</span>
          <span style={{ color: "#f87171" }}>✗ {answeredCount - correct}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center px-4 py-8 max-w-2xl mx-auto w-full relative">
        {/* Ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(124,29,29,0.08) 0%, transparent 70%)" }} />

        {/* Question number */}
        <div className="self-start mb-5 relative z-10">
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: "var(--burgundy-dim)", color: "#fca5a5", border: "1px solid rgba(124,29,29,0.3)" }}>
            Question {currentIndex + 1}
          </span>
        </div>

        {/* Question card */}
        <div className="w-full rounded-2xl border p-6 mb-5 relative z-10"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border-warm)",
            boxShadow: "0 0 30px rgba(124,29,29,0.06)",
          }}>
          <p className="font-serif text-xl font-semibold leading-relaxed" style={{ color: "var(--text)" }}>
            {q.question}
          </p>
        </div>

        {/* Choices */}
        <div className="w-full flex flex-col gap-3 mb-5 relative z-10">
          {q.choices.map((choice, idx) => (
            <button key={idx} onClick={() => handleSelect(idx)} disabled={isAnswered}
              className="w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 disabled:cursor-default"
              style={choiceStyle(idx)}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  backgroundColor:
                    isAnswered && idx === q.correctIndex ? "rgba(74,222,128,0.2)"
                    : isAnswered && idx === selected ? "rgba(248,113,113,0.2)"
                    : "var(--surface3)",
                  color:
                    isAnswered && idx === q.correctIndex ? "#4ade80"
                    : isAnswered && idx === selected ? "#f87171"
                    : "var(--text-muted)",
                  fontFamily: "var(--font-serif)",
                }}>
                {LABELS[idx]}
              </span>
              <p className="flex-1 text-sm font-medium"
                style={{
                  color:
                    isAnswered && idx === q.correctIndex ? "#4ade80"
                    : isAnswered && idx === selected && idx !== q.correctIndex ? "#f87171"
                    : isAnswered ? "var(--text-muted)"
                    : "var(--text-warm)",
                }}>
                {choice}
              </p>
              {isAnswered && idx === q.correctIndex && <CheckCircle size={15} style={{ color: "#4ade80", flexShrink: 0 }} />}
              {isAnswered && idx === selected && idx !== q.correctIndex && <XCircle size={15} style={{ color: "#f87171", flexShrink: 0 }} />}
            </button>
          ))}
        </div>

        {/* Must answer warning */}
        {!isAnswered && (
          <div className="w-full rounded-xl border p-3 flex items-center gap-2 mb-3 relative z-10"
            style={{ backgroundColor: "rgba(212,137,10,0.04)", borderColor: "rgba(212,137,10,0.2)" }}>
            <span style={{ color: "var(--amber)", fontSize: 14 }}>⚠</span>
            <p className="text-xs font-serif italic" style={{ color: "var(--amber)" }}>
              Choose an answer to continue.
            </p>
          </div>
        )}

        {/* Feedback */}
        {isAnswered && (
          <div className={`w-full rounded-xl border p-4 mb-4 flex items-start gap-3 relative z-10`}
            style={{
              backgroundColor: isCorrect ? "rgba(74,222,128,0.05)" : "rgba(248,113,113,0.05)",
              borderColor: isCorrect ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)",
            }}>
            <div className="mt-0.5">
              {isCorrect ? <CheckCircle size={16} style={{ color: "#4ade80" }} /> : <XCircle size={16} style={{ color: "#f87171" }} />}
            </div>
            <div className="flex-1">
              <p className="font-serif font-semibold text-sm" style={{ color: isCorrect ? "#4ade80" : "#f87171" }}>
                {isCorrect ? "Correct!" : "Incorrect"}
              </p>
              {!isCorrect && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Correct: <span style={{ color: "#4ade80", fontWeight: 600 }}>
                    {LABELS[q.correctIndex]}. {q.choices[q.correctIndex]}
                  </span>
                </p>
              )}
            </div>
            <button onClick={() => setShowExp((v) => !v)}
              className="flex items-center gap-1 text-xs transition-colors flex-shrink-0"
              style={{ color: "var(--amber)" }}>
              <Lightbulb size={12} />
              {showExp ? "Hide" : "Why?"}
            </button>
          </div>
        )}

        {showExp && isAnswered && (
          <div className="w-full rounded-xl border p-4 mb-4 relative z-10"
            style={{ backgroundColor: "rgba(212,137,10,0.04)", borderColor: "rgba(212,137,10,0.2)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--amber)" }}>
              Explanation
            </p>
            <p className="text-sm leading-relaxed font-serif" style={{ color: "var(--text-warm)" }}>
              {q.explanation}
            </p>
          </div>
        )}

        {isAnswered && (
          <button onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 relative z-10"
            style={{ backgroundColor: "var(--amber)", color: "#080604", boxShadow: "0 4px 20px rgba(212,137,10,0.3)" }}>
            {isLast ? (
              <><RotateCcw size={15} />{isCombinedPhase ? "See Final Results" : "See Results"}</>
            ) : (
              <>Next Question <ChevronRight size={15} /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}