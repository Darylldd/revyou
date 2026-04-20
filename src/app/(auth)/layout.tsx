import { Flame } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at top, rgba(212,137,10,0.08) 0%, transparent 70%)",
        }}
      />

      <nav
        className="relative z-10 flex items-center px-6 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center animate-flicker"
            style={{
              backgroundColor: "rgba(212,137,10,0.15)",
              border: "1px solid rgba(212,137,10,0.3)",
            }}
          >
            <Flame size={14} style={{ color: "var(--amber)" }} />
          </div>
          <span
            className="font-serif font-bold text-lg"
            style={{ color: "var(--text)" }}
          >
            ReviewAI
          </span>
        </Link>
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>

      <footer
        className="relative z-10 text-center text-xs py-4 border-t font-serif italic"
        style={{ color: "var(--text-faint)", borderColor: "var(--border)" }}
      >
        © {new Date().getFullYear()} ReviewAI
      </footer>
    </div>
  );
}