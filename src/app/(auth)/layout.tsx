import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
      {/* Navbar */}
      <nav
        className="flex items-center px-6 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="text-violet-400 w-5 h-5" />
          <span className="text-white font-bold text-lg">ReviewAI</span>
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>

      {/* Footer */}
      <footer
        className="text-center text-xs py-4 border-t"
        style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
      >
        © {new Date().getFullYear()} ReviewAI
      </footer>
    </div>
  );
}