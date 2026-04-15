"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkles,
  LayoutDashboard,
  Upload,
  BookOpen,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Plus,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import toast from "react-hot-toast";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload File", icon: Upload },
  { href: "/dashboard/reviewers", label: "My Reviewers", icon: BookOpen },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      toast.success("Signed out successfully.");
      router.push("/");
    } catch {
      toast.error("Failed to sign out.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <Spinner size={32} />
          <p className="text-slate-400 text-sm">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-30 flex flex-col border-r transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="text-violet-400 w-5 h-5" />
            <span className="text-white font-bold text-lg">ReviewAI</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${active
                    ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}

          {/* Quick action */}
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <Link
              href="/review"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-violet-300 hover:bg-violet-600/10 transition-all duration-200"
            >
              <Plus size={18} />
              New Review Session
            </Link>
          </div>
        </nav>

        {/* User Profile */}
        <div className="px-3 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-200"
            >
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt="avatar"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {user.displayName ?? "User"}
                </p>
                <p className="text-slate-500 text-xs truncate">{user.email}</p>
              </div>
              <ChevronDown
                size={14}
                className={`text-slate-500 transition-transform ${profileOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div
                className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border py-1 z-50"
                style={{ backgroundColor: "var(--surface2)", borderColor: "var(--border)" }}
              >
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  {loggingOut ? <Spinner size={14} /> : <LogOut size={14} />}
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{
            backgroundColor: "var(--bg)",
            borderColor: "var(--border)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <Menu size={22} />
          </button>
          <div className="hidden lg:block" />

          <Link
            href="/review"
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 active:scale-95"
          >
            <Plus size={16} />
            New Review
          </Link>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}