"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import Divider from "@/components/ui/Divider";
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
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Enter a valid email.";
    if (!password) newErrors.password = "Password is required.";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Invalid email or password.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Too many attempts. Try again later.");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user") {
        toast.error("Google sign-in failed. Try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div
        className="rounded-2xl p-8 border"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-slate-400 text-sm">Sign in to your ReviewAI account</p>
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border font-medium text-sm text-white transition-all duration-200 hover:bg-white/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          style={{ borderColor: "var(--border)", backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          {googleLoading ? <Spinner size={18} /> : <GoogleIcon size={18} />}
          Continue with Google
        </button>

        <Divider />

        {/* Email Form */}
        <form onSubmit={handleEmailLogin} className="mt-6 flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            icon={Mail}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
            autoComplete="email"
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            icon={Lock}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            autoComplete="current-password"
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? <Spinner size={18} /> : null}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>

      {/* Sign up link */}
      <p className="text-center text-slate-400 text-sm mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
          Sign up for free
        </Link>
      </p>

      {/* Guest mode */}
      <p className="text-center mt-3">
        <Link
          href="/review"
          className="text-slate-500 hover:text-slate-400 text-sm transition-colors underline underline-offset-2"
        >
          Continue without an account →
        </Link>
      </p>
    </div>
  );
}