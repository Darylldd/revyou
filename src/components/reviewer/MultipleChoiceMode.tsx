"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  ChevronRight,
  Lightbulb,
  RotateCcw,
  BookOpen,
} from "lucide-react";
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

export default function MultipleChoiceMode({
  questions,
  difficulty,
  onDone,
  isCombinedPhase,
  phaseLabel,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => new Array(questions.length).fill(null)
  );
  const [transitioning, setTransitioning] = useState(false);

  const q = questions[currentIndex];
  const isAnswered = selected !== null;
  const isCorrect = selected === q.correctIndex;
  const progress = (currentIndex / questions.length) * 100;
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
    if (transitioning || !isAnswered) return;
    if (isLast) { onDone(correct); return; }
    setTransitioning(true);
    setShowExp(false);
    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setTransitioning(false);
    }, 200);
  }

  function choiceBorderColor(idx: number): string {
    if (!isAnswered) return "var(--border-warm)";
    if (idx === q.correctIndex) return "rgba(74,222,128,0.5)";
    if (idx === selected) return "rgba(248,113,113,0.5)";
    return "var(--border)";
  }

  function choiceBg(idx: number): string {
    if (!isAnswered) return "var(--surface3)";
    if (idx === q.correctIndex) return "rgba(74,222,128,0.07)";
    if (idx === selected) return "rgba(248,113,113,0.07)";
    return "rgba(255,255,255,0.01)";
  }

  function choiceTextColor(idx: number): string {
    if (!isAnswered) return "var(--text-warm)";
    if (idx === q.correctIndex) return "#4ade80";
    if (idx === selected && idx !== q.correctIndex) return "#f87171";
    return "var(--text-faint)";
  }

  function labelBg(idx: number): string {
    if (!isAnswered) return "var(--surface)";
    if (idx === q.correctIndex) return "rgba(74,222,128,0.2)";
    if (idx === selected) return "rgba(248,113,113,0.2)";
    return "var(--surface)";
  }

  function labelColor(idx: number): string {
    if (!isAnswered) return "var(--text-muted)";
    if (idx === q.correctIndex) return "#4ade80";
    if (idx === selected) return "#f87171";
    return "var(--text-faint)";
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      {/* Progress header */}
      <div
        className="px-6 py-3 border-b flex items-center gap-4 sticky top-0 z-10"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-warm)" }}
      >
        {isCombinedPhase && (
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full font-serif italic whitespace-nowrap"
            style={{ backgroundColor: "rgba(212,137,10,0.12)", color: "var(--amber)" }}
          >
            {phaseLabel}
          </span>
        )}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-serif whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
            {currentIndex + 1} / {questions.length}
          </span>
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress + 100 / questions.length}%`,
                backgroundColor: "var(--burgundy2)",
              }}
            />
          </div>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize whitespace-nowrap"
            style={{ backgroundColor: ds.bg, color: ds.color }}
          >
            {difficulty}
          </span>
        </div>
        <div className="flex gap-3 text-sm font-semibold">
          <span style={{ color: "#4ade80" }}>✓ {correct}</span>
          <span style={{ color: "#f87171" }}>✗ {answeredCount - correct}</span>
        </div>
      </div>

      {/* Main layout — side by side on desktop */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full px-4 py-8 gap-6">

        {/* LEFT — Question panel */}
        <div className="lg:w-1/2 flex flex-col gap-4">
          {/* Badge */}
          <div>
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: "var(--burgundy-dim)",
                color: "#fca5a5",
                border: "1px solid rgba(124,29,29,0.3)",
              }}
            >
              Question {currentIndex + 1}
            </span>
          </div>

          {/* Question card — takes up most of the left side */}
          <div
            className="flex-1 rounded-2xl border p-7 flex flex-col justify-between"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border-warm)",
              boxShadow: "0 0 40px rgba(124,29,29,0.06)",
              minHeight: "260px",
            }}
          >
            <div className="flex items-start gap-3">
              <BookOpen size={16} className="flex-shrink-0 mt-1" style={{ color: "var(--text-faint)" }} />
              <p
                className="font-serif text-xl font-semibold leading-relaxed"
                style={{ color: "var(--text)" }}
              >
                {q.question}
              </p>
            </div>

            {/* Feedback after answering */}
            {isAnswered && (
              <div
                className="mt-5 rounded-xl border p-3.5 flex items-start gap-3"
                style={{
                  backgroundColor: isCorrect ? "rgba(74,222,128,0.05)" : "rgba(248,113,113,0.05)",
                  borderColor: isCorrect ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)",
                }}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {isCorrect
                    ? <CheckCircle size={15} style={{ color: "#4ade80" }} />
                    : <XCircle size={15} style={{ color: "#f87171" }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-serif font-semibold text-sm"
                    style={{ color: isCorrect ? "#4ade80" : "#f87171" }}
                  >
                    {isCorrect ? "Correct!" : "Incorrect"}
                  </p>
                  {!isCorrect && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Correct:{" "}
                      <span style={{ color: "#4ade80", fontWeight: 600 }}>
                        {LABELS[q.correctIndex]}. {q.choices[q.correctIndex]}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowExp((v) => !v)}
                  className="flex items-center gap-1 text-xs flex-shrink-0 transition-colors"
                  style={{ color: "var(--amber)" }}
                >
                  <Lightbulb size={11} />
                  {showExp ? "Hide" : "Explanation"}
                </button>
              </div>
            )}

            {/* Explanation */}
            {showExp && isAnswered && (
              <div
                className="mt-3 rounded-xl border p-3.5"
                style={{
                  backgroundColor: "rgba(212,137,10,0.04)",
                  borderColor: "rgba(212,137,10,0.2)",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--amber)" }}
                >
                  Explanation
                </p>
                <p
                  className="text-sm leading-relaxed font-serif"
                  style={{ color: "var(--text-warm)" }}
                >
                  {q.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Next button under question on desktop */}
          <div className="hidden lg:block">
            {!isAnswered ? (
              <div
                className="rounded-xl border p-3 flex items-center gap-2"
                style={{
                  backgroundColor: "rgba(212,137,10,0.04)",
                  borderColor: "rgba(212,137,10,0.15)",
                }}
              >
                <span style={{ color: "var(--amber)", fontSize: 13 }}>⚠</span>
                <p className="text-xs font-serif italic" style={{ color: "var(--amber)" }}>
                  Select an answer on the right to continue.
                </p>
              </div>
            ) : (
              <button
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{
                  backgroundColor: "var(--amber)",
                  color: "#080604",
                  boxShadow: "0 4px 20px rgba(212,137,10,0.3)",
                }}
              >
                {isLast ? (
                  <><RotateCcw size={14} />{isCombinedPhase ? "See Final Results" : "See Results"}</>
                ) : (
                  <>Next Question <ChevronRight size={14} /></>
                )}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — Choices panel */}
        <div className="lg:w-1/2 flex flex-col gap-3">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--text-faint)" }}
          >
            Choose your answer
          </p>

          {q.choices.map((choice, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={isAnswered}
              className="w-full flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-200 disabled:cursor-default group"
              style={{
                backgroundColor: choiceBg(idx),
                borderColor: choiceBorderColor(idx),
             
              }}
              onMouseEnter={(e) => {
                if (!isAnswered) e.currentTarget.style.borderColor = "rgba(212,137,10,0.4)";
              }}
              onMouseLeave={(e) => {
                if (!isAnswered) e.currentTarget.style.borderColor = "var(--border-warm)";
              }}
            >
              {/* Letter badge */}
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all font-serif"
                style={{
                  backgroundColor: labelBg(idx),
                  color: labelColor(idx),
                  border: `1px solid ${isAnswered && idx === q.correctIndex ? "rgba(74,222,128,0.3)" : isAnswered && idx === selected ? "rgba(248,113,113,0.3)" : "var(--border)"}`,
                }}
              >
                {LABELS[idx]}
              </span>

              {/* Choice text */}
              <p
                className="flex-1 text-sm font-medium leading-relaxed pt-1 font-serif"
                style={{ color: choiceTextColor(idx) }}
              >
                {choice}
              </p>

              {/* Result icon */}
              {isAnswered && idx === q.correctIndex && (
                <CheckCircle size={16} style={{ color: "#4ade80", flexShrink: 0, marginTop: 2 }} />
              )}
              {isAnswered && idx === selected && idx !== q.correctIndex && (
                <XCircle size={16} style={{ color: "#f87171", flexShrink: 0, marginTop: 2 }} />
              )}
            </button>
          ))}

          {/* Mobile next button */}
          <div className="lg:hidden mt-2">
            {!isAnswered ? (
              <div
                className="rounded-xl border p-3 flex items-center gap-2"
                style={{
                  backgroundColor: "rgba(212,137,10,0.04)",
                  borderColor: "rgba(212,137,10,0.15)",
                }}
              >
                <span style={{ color: "var(--amber)", fontSize: 13 }}>⚠</span>
                <p className="text-xs font-serif italic" style={{ color: "var(--amber)" }}>
                  Choose an answer to continue.
                </p>
              </div>
            ) : (
              <button
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 mt-1"
                style={{
                  backgroundColor: "var(--amber)",
                  color: "#080604",
                  boxShadow: "0 4px 20px rgba(212,137,10,0.3)",
                }}
              >
                {isLast ? (
                  <><RotateCcw size={14} />{isCombinedPhase ? "See Final Results" : "See Results"}</>
                ) : (
                  <>Next Question <ChevronRight size={14} /></>
                )}
              </button>
            )}
          </div>

          {/* Question dots navigation */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {questions.map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  backgroundColor:
                    i === currentIndex
                      ? "var(--amber)"
                      : answers[i] !== null
                      ? answers[i] === questions[i].correctIndex
                        ? "#4ade80"
                        : "#f87171"
                      : "var(--border)",
                  transform: i === currentIndex ? "scale(1.5)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}