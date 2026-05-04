"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Upload, Brain, Zap, Clock, ChevronRight } from "lucide-react";

const features = [
  { icon: Upload,   title: "Upload anything",       desc: "PDF, PPTX, DOCX, XLSX, images — we extract every word.", color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
  { icon: Brain,    title: "AI generates questions", desc: "Flashcards and quizzes from your exact material.",        color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  { icon: Zap,      title: "Multiple modes",         desc: "Flashcards, multiple choice quiz, or both combined.",      color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
  { icon: Clock,    title: "Any difficulty",         desc: "Easy for warm-up, Hard for the night before the exam.",   color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Nav */}
      <nav style={{
        borderBottom: "1px solid var(--border)",
        padding: "0 24px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--card)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={18} style={{ color: "var(--blue)" }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>RevYouw</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {user ? (
            <Link href="/dashboard" className="btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none", padding: "6px 12px" }}>Sign in</Link>
              <Link href="/signup" className="btn-primary">Get started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px 40px", textAlign: "center" }} className="fade-up">
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)",
          borderRadius: 20, padding: "4px 14px", marginBottom: 24,
          fontSize: 12, fontWeight: 600, color: "#a78bfa",
        }}>
          <Sparkles size={12} />
          Powered by LLaMA 3.3 70B
        </div>

        <h1 style={{
          fontSize: "clamp(2.4rem, 5vw, 4rem)",
          fontWeight: 800, lineHeight: 1.15,
          color: "var(--ink)", marginBottom: 16,
          letterSpacing: "-0.02em",
        }}>
          Study smarter.{" "}
          <span style={{ color: "var(--blue)" }}>Panic less.</span>
        </h1>

        <p style={{ fontSize: 16, color: "var(--ink-3)", maxWidth: 480, lineHeight: 1.7, marginBottom: 32 }}>
          Upload your reviewer files and get AI-generated flashcards and quizzes in seconds. No generic questions — only from your actual material.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/review" className="btn-primary" style={{ fontSize: 15, padding: "10px 22px" }}>
            Start reviewing <ChevronRight size={15} />
          </Link>
          {!user && (
            <Link href="/signup" style={{
              display: "inline-flex", alignItems: "center",
              fontSize: 15, padding: "9px 20px", borderRadius: 10,
              border: "1.5px solid var(--border)", color: "var(--ink-2)", textDecoration: "none",
            }}>
              Create free account
            </Link>
          )}
        </div>

        <p style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 14 }}>
          No account needed to try · Sign in to save your files
        </p>
      </div>

      {/* Features */}
      <div style={{ padding: "40px 24px 60px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {features.map((f) => (
            <div key={f.title} style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 14, padding: "20px 18px",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, marginBottom: 12,
                background: f.bg, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <f.icon size={18} style={{ color: f.color }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{f.title}</p>
              <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer style={{ textAlign: "center", fontSize: 12, color: "var(--ink-4)", padding: "16px 0 24px", borderTop: "1px solid var(--border)" }}>
        RevYouw — {new Date().getFullYear()}
      </footer>
    </div>
  );
}