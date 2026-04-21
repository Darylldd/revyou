import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav style={{
        background: "var(--card)", borderBottom: "1.5px solid var(--border)",
        padding: "0 24px", height: "48px",
        display: "flex", alignItems: "center",
      }}>
        <Link href="/" className="hand" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>
          Review<span style={{ color: "var(--blue)" }}>AI</span>
        </Link>
      </nav>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        {children}
      </div>
    </div>
  );
}