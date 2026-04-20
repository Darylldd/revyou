"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Flame, LayoutDashboard, Upload, BookOpen, LogOut, Menu, X, Plus, ChevronDown } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import toast from "react-hot-toast";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload File", icon: Upload },
  { href: "/dashboard/reviewers", label: "My Reviewers", icon: BookOpen },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      toast.success("Signed out.");
      router.push("/");
    } catch { toast.error("Failed to sign out."); }
    finally { setLoggingOut(false); }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
      <div className="flex flex-col items-center gap-3">
        <Spinner size={28} />
        <p className="font-serif italic text-sm" style={{ color: "var(--text-muted)" }}>
          Opening your library...
        </p>
      </div>
    </div>
  );

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "U";

  return (
   <div className="h-screen flex overflow-hidden" style={{ backgroundColor: "var(--bg)" }}>
      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — book spine style */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-30 flex flex-col  border-r transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-warm)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b " style={{ borderColor: "var(--border)" }}>
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center animate-flicker"
              style={{ backgroundColor: "rgba(212,137,10,0.15)", border: "1px solid rgba(212,137,10,0.3)" }}
            >
              <Flame size={13} style={{ color: "var(--amber)" }} />
            </div>
            <span className="font-serif font-bold text-lg" style={{ color: "var(--text)" }}>RevYouw</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden" style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
<nav className="px-3 py-4 flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: active ? "rgba(212,137,10,0.12)" : "transparent",
                  color: active ? "var(--amber)" : "var(--text-muted)",
                  borderLeft: active ? "2px solid var(--amber)" : "2px solid transparent",
                }}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}

          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <Link href="/review" onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: "rgba(212,137,10,0.08)",
                color: "var(--amber)",
                border: "1px solid rgba(212,137,10,0.2)",
              }}
            >
              <Plus size={15} />
              New Review Session
            </Link>
          </div>
        </nav>

        {/* Profile */}
        <div className="px-3 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{ backgroundColor: profileOpen ? "var(--surface2)" : "transparent" }}
            >
              {user.photoURL ? (
                <Image src={user.photoURL} alt="avatar" width={32} height={32} className="rounded-full flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: "var(--burgundy)", color: "var(--text-warm)" }}>
                  {initials}
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                  {user.displayName ?? "User"}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{user.email}</p>
              </div>
              <ChevronDown size={13} className={`transition-transform ${profileOpen ? "rotate-180" : ""}`} style={{ color: "var(--text-faint)" }} />
            </button>

            {profileOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border py-1 z-50"
                style={{ backgroundColor: "var(--surface2)", borderColor: "var(--border-warm)" }}>
                <button onClick={handleLogout} disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "#f87171" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {loggingOut ? <Spinner size={13} /> : <LogOut size={13} />}
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ backgroundColor: "var(--bg-warm)", borderColor: "var(--border)" }}
        >
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden" style={{ color: "var(--text-muted)" }}>
            <Menu size={20} />
          </button>
          <div className="hidden lg:block" />
          <Link
            href="/review"
            className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
            style={{ backgroundColor: "var(--amber)", color: "#080604" }}
          >
            <Plus size={14} />
            New Review
          </Link>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}