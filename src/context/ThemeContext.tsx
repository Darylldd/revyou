"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "paper" | "hello-kitty" | "readable" | "dark" | "plain";

const THEMES: { id: Theme; label: string; emoji: string }[] = [
  { id: "paper",       label: "Paper",       emoji: "" },
  { id: "hello-kitty", label: "Hello Kitty", emoji: "" },
  { id: "readable",    label: "Readable",    emoji: "" },
  { id: "dark",        label: "Dark",        emoji: "" },
  { id: "plain",       label: "Plain",       emoji: "" },
];

interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void; themes: typeof THEMES; }
const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("paper");

  useEffect(() => {
    const saved = localStorage.getItem("reviewai-theme") as Theme | null;
    if (saved) apply(saved);
  }, []);

  function apply(t: Theme) {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("reviewai-theme", t);
  }

  return (
    <Ctx.Provider value={{ theme, setTheme: apply, themes: THEMES }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}