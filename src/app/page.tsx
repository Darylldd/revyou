"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ChevronRight, Upload, Brain, Zap, BarChart2 } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>

      {/* Top nav — single strip, no redundancy */}
      <nav style={{
        background: "var(--card)",
        borderBottom: "1.5px solid var(--border)",
        padding: "0 24px",
        height: "48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span className="hand" style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>
          Review<span style={{ color: "var(--blue)" }}>AI</span>
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {user ? (
            <Link href="/dashboard" style={{
              background: "var(--blue)", color: "#fff",
              padding: "6px 16px", borderRadius: 4,
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>
              my desk →
            </Link>
          ) : (
            <>
              <Link href="/login" style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none" }}>sign in</Link>
              <Link href="/signup" style={{
                background: "var(--blue)", color: "#fff",
                padding: "6px 16px", borderRadius: 4,
                fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>
                get started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero — looks like a pinned note on a board */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 0" }} className="fade-up">

        {/* Tape-pinned heading card */}
        <div style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 3,
          padding: "36px 40px",
          position: "relative",
          marginBottom: 24,
          boxShadow: "3px 4px 0 var(--border-2)",
        }} className="tape">
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
            color: "var(--ink-4)", textTransform: "uppercase", marginBottom: 12,
          }}>
            AI-powered reviewer
          </div>
          <h1 className="hand" style={{
            fontSize: "clamp(2.4rem, 6vw, 3.6rem)",
            fontWeight: 700, lineHeight: 1.15,
            color: "var(--ink)", marginBottom: 16,
          }}>
            Stop re-reading.<br />
            <span className="hi-y">Start remembering.</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 24, maxWidth: 480 }}>
            Upload your PDF, PowerPoint, or photo of your notes.
            We generate flashcards and quizzes from your actual material — not generic ones.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/review" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "var(--blue)", color: "#fff",
              padding: "10px 22px", borderRadius: 4,
              fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}>
              start a session <ChevronRight size={15} />
            </Link>
            {!user && (
              <Link href="/signup" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "transparent", color: "var(--ink-2)",
                padding: "9px 20px", borderRadius: 4,
                fontSize: 14, fontWeight: 500, textDecoration: "none",
                border: "1.5px solid var(--border)",
              }}>
                save your progress
              </Link>
            )}
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 12 }}>
            no account needed to try · sign in to keep your files
          </p>
        </div>

        {/* Three index cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 24 }}>
          {[
            { icon: Upload, label: "Upload anything", desc: "PDF, PPTX, DOCX, images, Excel, iPhone photos", color: "var(--blue)", bg: "var(--blue-light)" },
            { icon: Brain, label: "AI generates questions", desc: "Flashcards and quizzes from your exact material — no hallucinating", color: "#7c3aed", bg: "#ede9fe" },
            { icon: BarChart2, label: "3 difficulty levels", desc: "Easy for warm-up, Hard for the night before the exam", color: "var(--green)", bg: "var(--green-light)" },
          ].map((f, i) => (
            <div key={f.label} style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 3, padding: "16px 18px",
              boxShadow: "2px 3px 0 var(--border-2)",
              animationDelay: `${i * 0.08}s`,
            }} className="paper-in">
              <div style={{
                width: 32, height: 32, borderRadius: 4,
                background: f.bg, display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 10,
              }}>
                <f.icon size={16} style={{ color: f.color }} />
              </div>
              <div className="hand" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{f.label}</div>
              <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom sticky note CTA */}
        <div style={{
          background: "var(--sticky-y)", border: "1px solid #f0e060",
          borderRadius: 2, padding: "20px 24px",
          transform: "rotate(-0.3deg)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16, flexWrap: "wrap",
          boxShadow: "2px 3px 0 #e6d640",
          marginBottom: 48,
        }}>
          <div>
            <div className="hand" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>
              Save files, combine reviewers, track scores
            </div>
            <p style={{ fontSize: 13, color: "#78716c" }}>Free account · no credit card</p>
          </div>
          <Link href="/signup" style={{
            background: "var(--ink)", color: "var(--card)",
            padding: "9px 20px", borderRadius: 4,
            fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap",
          }}>
            create account
          </Link>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-5)", paddingBottom: 32, fontStyle: "italic" }}>
          good luck on your exam ✧
        </p>
      </div>
    </div>
  );
}