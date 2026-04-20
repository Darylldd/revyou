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
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email.";
    if (!password) e.password = "Password is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password")
        toast.error("Invalid email or password.");
      else if (code === "auth/too-many-requests")
        toast.error("Too many attempts. Try again later.");
      else toast.error("Login failed.");
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user") toast.error("Google sign-in failed.");
    } finally { setGoogleLoading(false); }
  }

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div
        className="rounded-2xl p-8 border"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-warm)" }}
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-serif font-bold text-3xl mb-1.5" style={{ color: "var(--text)" }}>
            Welcome back
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            The library is open. Your notes are waiting.
          </p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border font-medium text-sm transition-all duration-200 hover:border-amber-500/50 active:scale-95 disabled:opacity-50 mb-6"
          style={{
            borderColor: "var(--border-warm)",
            backgroundColor: "var(--surface2)",
            color: "var(--text-warm)",
          }}
        >
          {googleLoading ? <Spinner size={18} /> : <GoogleIcon size={18} />}
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
          <span className="text-xs font-serif italic" style={{ color: "var(--text-faint)" }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            icon={Mail}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
            error={errors.email}
          />
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            icon={Lock}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
            error={errors.password}
            rightElement={
              <button type="button" onClick={() => setShowPassword((v) => !v)} style={{ color: "var(--text-muted)" }}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 mt-1"
            style={{
              backgroundColor: "var(--amber)",
              color: "#080604",
              boxShadow: "0 4px 20px rgba(212,137,10,0.3)",
            }}
          >
            {loading ? <Spinner size={16} /> : null}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm mt-5" style={{ color: "var(--text-muted)" }}>
        No account?{" "}
        <Link href="/signup" className="font-semibold transition-colors" style={{ color: "var(--amber)" }}>
          Join the library →
        </Link>
      </p>
      <p className="text-center mt-2">
        <Link href="/review" className="text-xs underline underline-offset-2 transition-colors" style={{ color: "var(--text-faint)" }}>
          Continue without an account
        </Link>
      </p>
    </div>
  );
}