"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Plus, LogOut, ChevronDown, LayoutDashboard, Upload, BookOpen } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import ThemeSwitch from "@/components/ui/ThemeSwitch";
import HelloKittyBanner from "@/components/ui/HelloKittyBanner";
import toast from "react-hot-toast";

const tabs = [
  { href: "/dashboard",           label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/upload",    label: "Upload",    icon: Upload },
  { href: "/dashboard/reviewers", label: "Reviewers", icon: BookOpen },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); router.push("/"); }
    catch { toast.error("Failed to sign out."); }
    finally { setLoggingOut(false); }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)" }}>
      <div style={{ textAlign: "center" }}>
        <Spinner size={24} />
        <p style={{ marginTop: 10, color: "var(--ink-3)", fontSize: 13 }}>Loading...</p>
      </div>
    </div>
  );

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <header style={{
        background: "var(--card)", borderBottom: "1px solid var(--border)",
        padding: "0 20px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
          <Sparkles size={16} style={{ color: "var(--blue)" }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>RevYouw</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/review" className="btn-primary" style={{ fontSize: 13 }}>
            <Plus size={13} /> New Review
          </Link>

          <ThemeSwitch />

          <div style={{ position: "relative" }}>
            <button onClick={() => setProfileOpen((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 8px 4px 4px",
                background: profileOpen ? "var(--card-2)" : "transparent",
                border: `1px solid ${profileOpen ? "var(--border)" : "transparent"}`,
                borderRadius: 20, cursor: "pointer",
              }}>
              {user.photoURL ? (
                <Image src={user.photoURL} alt="avatar" width={26} height={26} style={{ borderRadius: "50%" }} />
              ) : (
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: "var(--blue-light)", color: "var(--blue)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                }}>
                  {initials}
                </div>
              )}
              <span style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500 }}>
                {user.displayName?.split(" ")[0] ?? "Me"}
              </span>
              <ChevronDown size={12} style={{ color: "var(--ink-4)", transform: profileOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            </button>

            {profileOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 12, minWidth: 170, zIndex: 50, padding: "4px 0",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              }}>
                <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 11, color: "var(--ink-3)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                </div>
                <button onClick={handleLogout} disabled={loggingOut}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 14px", background: "none", border: "none",
                    cursor: "pointer", fontSize: 13, color: "var(--red)",
                    fontFamily: "var(--font-sans)",
                  }}>
                  {loggingOut ? <Spinner size={13} /> : <LogOut size={13} />}
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <HelloKittyBanner />

      {/* Tab nav */}
      <div style={{
        background: "var(--card)", borderBottom: "1px solid var(--border)",
        padding: "0 20px", display: "flex", gap: 0,
      }}>
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link key={tab.href} href={tab.href}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 13, fontWeight: active ? 600 : 500,
                padding: "12px 16px",
                color: active ? "var(--blue)" : "var(--ink-3)",
                textDecoration: "none",
                borderBottom: `2px solid ${active ? "var(--blue)" : "transparent"}`,
                marginBottom: "-1px",
                transition: "color .15s, border-color .15s",
              }}>
              <tab.icon size={14} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      <main style={{ flex: 1, padding: "24px 20px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}