import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav style={{
        background: "var(--card)", borderBottom: "1px solid var(--border)",
        padding: "0 24px", height: 52,
        display: "flex", alignItems: "center",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
          <Sparkles size={16} style={{ color: "var(--blue)" }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>RevYouw</span>
        </Link>
      </nav>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        {children}
      </div>
    </div>
  );
}