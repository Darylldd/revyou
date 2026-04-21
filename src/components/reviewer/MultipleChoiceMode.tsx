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
const diffColor: Record<DifficultyLevel, string> = { easy: "#16a34a", medium: "#d97706", hard: "#dc2626" };

export default function MultipleChoiceMode({ questions, difficulty, onDone, isCombinedPhase, phaseLabel }: Props) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => new Array(questions.length).fill(null));
  const [transitioning, setTransitioning] = useState(false);

  const q = questions[idx];
  const answered = selected !== null;
  const isCorrect = selected === q.correctIndex;
  const isLast = idx === questions.length - 1;
  const progress = Math.round(((idx) / questions.length) * 100);
  const answeredCount = answers.filter((a) => a !== null).length;

  function pick(i: number) {
    if (answered || transitioning) return;
    const na = [...answers]; na[idx] = i;
    setAnswers(na); setSelected(i);
    if (i === q.correctIndex) setCorrect((c) => c + 1);
  }

  function next() {
    if (!answered || transitioning) return;
    if (isLast) { onDone(correct); return; }
    setTransitioning(true); setShowExp(false);
    setTimeout(() => { setIdx((i) => i + 1); setSelected(null); setTransitioning(false); }, 180);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>

      {/* Progress */}
      <div style={{ background: "var(--card)", borderBottom: "1.5px solid var(--border)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        {isCombinedPhase && <span className="hand" style={{ fontSize: 13, color: "var(--blue)", whiteSpace: "nowrap" }}>{phaseLabel}</span>}
        <span style={{ fontSize: 12, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{idx + 1} / {questions.length}</span>
        <div style={{ flex: 1, height: 4, background: "var(--border-2)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress + 100 / questions.length}%`, background: diffColor[difficulty], borderRadius: 2, transition: "width .4s" }} />
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: 13, fontWeight: 600 }}>
          <span style={{ color: "#16a34a" }}>✓ {correct}</span>
          <span style={{ color: "#dc2626" }}>✗ {answeredCount - correct}</span>
        </div>
      </div>

      {/* Side-by-side layout */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, maxWidth: 980, width: "100%", margin: "0 auto", padding: "24px 16px" }}>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>

          {/* LEFT — Question */}
          <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                padding: "3px 8px", borderRadius: 2,
                background: "var(--red-light)", color: "var(--red)",
              }}>
                Q{idx + 1}
              </span>
              <span className="hand" style={{ fontSize: 12, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {difficulty}
              </span>
            </div>

            {/* Question card — ruled paper */}
            <div className="ruled" style={{
              border: "1px solid var(--border)", borderLeft: "3px solid var(--rule-red)",
              borderRadius: 3, padding: "20px 20px 20px 28px",
              flex: 1, background: "var(--card)",
              boxShadow: "2px 3px 0 var(--border-2)",
            }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", lineHeight: 1.65 }}>{q.question}</p>
            </div>

            {/* Feedback */}
            {answered && (
              <div style={{
                border: `1px solid ${isCorrect ? "#86efac" : "#fca5a5"}`,
                borderRadius: 3, padding: "12px 16px",
                background: isCorrect ? "var(--green-light)" : "var(--red-light)",
                display: "flex", alignItems: "flex-start", gap: 8,
              }}>
                {isCorrect ? <CheckCircle size={15} style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }} /> : <XCircle size={15} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />}
                <div style={{ flex: 1 }}>
                  <p className="hand" style={{ fontSize: 15, fontWeight: 700, color: isCorrect ? "#16a34a" : "#dc2626", marginBottom: 2 }}>
                    {isCorrect ? "correct!" : "incorrect"}
                  </p>
                  {!isCorrect && (
                    <p style={{ fontSize: 12, color: "var(--ink-2)" }}>
                      Answer: <span style={{ fontWeight: 600 }}>{LABELS[q.correctIndex]}. {q.choices[q.correctIndex]}</span>
                    </p>
                  )}
                </div>
                <button onClick={() => setShowExp((v) => !v)} style={{
                  display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
                  cursor: "pointer", fontSize: 12, color: "#d97706", fontWeight: 600, flexShrink: 0,
                }}>
                  <Lightbulb size={12} /> {showExp ? "hide" : "why?"}
                </button>
              </div>
            )}

            {showExp && answered && (
              <div style={{
                border: "1px solid #fde047", borderRadius: 3, padding: "10px 14px",
                background: "#fefce8", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6,
              }}>
                {q.explanation}
              </div>
            )}

            {/* Next button — desktop only */}
            <div style={{ display: "none" }} className="desktop-next">
              {!answered ? (
                <p style={{ fontSize: 12, color: "var(--ink-4)", fontStyle: "italic" }}>← pick an answer to continue</p>
              ) : (
                <button onClick={next} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "var(--blue)", color: "#fff", border: "none",
                  borderRadius: 4, padding: "10px 20px", fontSize: 14, fontWeight: 700,
                  cursor: "pointer", fontFamily: "var(--font-hand)",
                  boxShadow: "3px 4px 0 rgba(37,99,235,0.25)",
                }}>
                  <RotateCcw size={14} />
                  {isLast ? (isCombinedPhase ? "final results" : "see results") : "next question"}
                  {!isLast && <ChevronRight size={14} />}
                </button>
              )}
            </div>
          </div>

          {/* RIGHT — Choices */}
          <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase", marginBottom: 2 }}>
              choose your answer
            </p>

            {q.choices.map((choice, i) => {
              let bg = "var(--card)";
              let border = "var(--border)";
              let labelBg = "var(--paper)";
              let labelColor = "var(--ink-3)";
              let textColor = "var(--ink)";

              if (answered) {
                if (i === q.correctIndex) { bg = "var(--green-light)"; border = "#86efac"; labelBg = "#bbf7d0"; labelColor = "#16a34a"; textColor = "#15803d"; }
                else if (i === selected) { bg = "var(--red-light)"; border = "#fca5a5"; labelBg = "#fecdd3"; labelColor = "#dc2626"; textColor = "#b91c1c"; }
                else { bg = "var(--card)"; border = "var(--border-2)"; textColor = "var(--ink-4)"; }
              }

              return (
                <button key={i} onClick={() => pick(i)} disabled={answered}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 14px",
                    background: bg, border: `1.5px solid ${border}`,
                    borderRadius: 3, cursor: answered ? "default" : "pointer", textAlign: "left",
                    transition: "all .15s",
                    boxShadow: !answered && i === selected ? "none" : "1px 2px 0 var(--border-2)",
                  }}
                  onMouseEnter={(e) => { if (!answered) { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.background = "var(--blue-light)"; } }}
                  onMouseLeave={(e) => { if (!answered) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card)"; } }}
                >
                  <span style={{
                    width: 28, height: 28, borderRadius: 3, flexShrink: 0,
                    background: labelBg, color: labelColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, fontFamily: "var(--font-hand)",
                    border: `1px solid ${border}`,
                  }}>
                    {LABELS[i]}
                  </span>
                  <p style={{ fontSize: 13, fontWeight: 500, color: textColor, lineHeight: 1.5, margin: "2px 0 0" }}>{choice}</p>
                  {answered && i === q.correctIndex && <CheckCircle size={14} style={{ color: "#16a34a", flexShrink: 0, marginTop: 2 }} />}
                  {answered && i === selected && i !== q.correctIndex && <XCircle size={14} style={{ color: "#dc2626", flexShrink: 0, marginTop: 2 }} />}
                </button>
              );
            })}

            {/* Must answer warning */}
            {!answered && (
              <p style={{ fontSize: 12, color: "var(--ink-4)", fontStyle: "italic", marginTop: 4 }}>
                you must pick an answer to continue
              </p>
            )}

            {/* Next — mobile */}
            {answered && (
              <button onClick={next} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: "var(--blue)", color: "#fff", border: "none",
                borderRadius: 4, padding: "11px 20px", fontSize: 15, fontWeight: 700,
                cursor: "pointer", marginTop: 4, fontFamily: "var(--font-hand)",
                boxShadow: "3px 4px 0 rgba(37,99,235,0.25)",
              }}>
                {isLast ? <><RotateCcw size={14} />{isCombinedPhase ? "final results" : "see results"}</> : <>next question <ChevronRight size={14} /></>}
              </button>
            )}
          </div>
        </div>

        {/* Dot progress */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 20, justifyContent: "center" }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: "50%",
              background: i === idx ? diffColor[difficulty] : answers[i] !== null ? (answers[i] === questions[i].correctIndex ? "#16a34a" : "#dc2626") : "var(--border-2)",
              transform: i === idx ? "scale(1.5)" : "scale(1)",
              transition: "all .2s",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}