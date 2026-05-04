"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme, type Theme } from "@/context/ThemeContext";

const DOT_COLORS: Record<Theme, string> = {
  "paper":       "#c9bfad",
  "hello-kitty": "#e91e8c",
  "readable":    "#1d4ed8",
  "dark":        "#818cf8",
  "plain":       "#222222",
};

export default function ThemeSwitch() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Change theme"
        style={{
          width: 32, height: 32,
          borderRadius: "50%",
          border: "2px solid var(--border)",
          background: "var(--card)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
          boxShadow: "1px 2px 0 var(--border-2)",
          padding: 0,
        }}
      >
        {/* Current theme color dot */}
        <div style={{
          width: 16, height: 16, borderRadius: "50%",
          background: DOT_COLORS[theme],
        }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "var(--card)", border: "1.5px solid var(--border)",
          borderRadius: 6, padding: 8,
          boxShadow: "3px 4px 0 var(--border-2)",
          zIndex: 100, minWidth: 160,
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, paddingLeft: 4 }}>
            Theme
          </p>
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "7px 8px", borderRadius: 4, border: "none",
                background: theme === t.id ? "var(--blue-light)" : "transparent",
                cursor: "pointer", textAlign: "left",
                fontFamily: "var(--font-sans)",
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: "50%",
                background: DOT_COLORS[t.id],
                border: theme === t.id ? "2px solid var(--blue)" : "2px solid transparent",
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: theme === t.id ? 600 : 400 }}>
                 {t.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}