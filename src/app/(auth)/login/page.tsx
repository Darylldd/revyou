"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import GoogleIcon from "@/components/ui/GoogleIcon";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "email required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "invalid email";
    if (!password) e.password = "password required";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleLogin(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password")
        toast.error("Wrong email or password.");
      else if (code === "auth/too-many-requests")
        toast.error("Too many attempts.");
      else toast.error("Login failed.");
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    setGLoading(true);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user") toast.error("Google sign-in failed.");
    } finally { setGLoading(false); }
  }

  return (
    <div style={{ width: "100%", maxWidth: 400 }} className="fade-up">
      {/* Card — looks like a lined index card */}
      <div style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 3, padding: "32px",
        boxShadow: "3px 4px 0 var(--border-2)",
        position: "relative",
      }} className="tape">
        <h1 className="hand" style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
          welcome back
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}>
          pick up where you left off
        </p>

        <button
          onClick={handleGoogle} disabled={gLoading || loading}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, padding: "9px 16px",
            background: "var(--card-2)", border: "1.5px solid var(--border)",
            borderRadius: 4, fontSize: 13, fontWeight: 500,
            color: "var(--ink-2)", cursor: "pointer", marginBottom: 20,
          }}
        >
          {gLoading ? <Spinner size={16} /> : <GoogleIcon size={16} />}
          continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: "1.5px", background: "var(--border-2)" }} />
          <span className="hand" style={{ fontSize: 14, color: "var(--ink-4)" }}>or</span>
          <div style={{ flex: 1, height: "1.5px", background: "var(--border-2)" }} />
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Email" type="email" placeholder="you@example.com" icon={Mail}
            value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
            error={errors.email} autoComplete="email" />
          <Input label="Password" type={showPw ? "text" : "password"} placeholder="••••••••" icon={Lock}
            value={password} onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
            error={errors.password} autoComplete="current-password"
            rightElement={
              <button type="button" onClick={() => setShowPw((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-4)", padding: 0 }}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            } />
          <button type="submit" disabled={loading || gLoading} style={{
            background: "var(--blue)", color: "#fff",
            border: "none", borderRadius: 4,
            padding: "10px 16px", fontSize: 14, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            opacity: loading ? 0.7 : 1, marginTop: 4,
          }}>
            {loading ? <Spinner size={15} /> : null}
            {loading ? "signing in..." : "sign in"}
          </button>
        </form>
      </div>

      <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--ink-3)" }}>
        no account?{" "}
        <Link href="/signup" style={{ color: "var(--blue)", fontWeight: 600 }}>sign up free</Link>
        {" · "}
        <Link href="/review" style={{ color: "var(--ink-4)" }}>try without account</Link>
      </div>
    </div>
  );
}