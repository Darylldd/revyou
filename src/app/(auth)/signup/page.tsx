"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import Divider from "@/components/ui/Divider";
import GoogleIcon from "@/components/ui/GoogleIcon";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function validate() {
    const newErrors: typeof errors = {};
    if (!displayName.trim()) newErrors.displayName = "Name is required.";
    else if (displayName.trim().length < 2) newErrors.displayName = "Name must be at least 2 characters.";
    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Enter a valid email.";
    if (!password) newErrors.password = "Password is required.";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters.";
    if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const credential = await signUpWithEmail(email, password);
      const user = credential.user;

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: displayName.trim() });

      // Create Firestore user document
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName.trim(),
        photoURL: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Account created! Welcome to ReviewAI 🎉");
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-in-use") {
        setErrors((prev) => ({ ...prev, email: "This email is already registered." }));
      } else if (code === "auth/weak-password") {
        setErrors((prev) => ({ ...prev, password: "Password is too weak." }));
      } else {
        toast.error("Sign up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    try {
      const credential = await signInWithGoogle();
      const user = credential.user;

      // Upsert Firestore user document
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast.success("Welcome to ReviewAI! 🎉");
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
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-slate-400 text-sm">Start studying smarter with ReviewAI</p>
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border font-medium text-sm text-white transition-all duration-200 hover:bg-white/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          style={{ borderColor: "var(--border)", backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          {googleLoading ? <Spinner size={18} /> : <GoogleIcon size={18} />}
          Continue with Google
        </button>

        <Divider />

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="mt-6 flex flex-col gap-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="Juan dela Cruz"
            icon={User}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (errors.displayName) setErrors((prev) => ({ ...prev, displayName: undefined }));
            }}
            error={errors.displayName}
            autoComplete="name"
          />

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
            placeholder="Min. 6 characters"
            icon={Lock}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            autoComplete="new-password"
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

          <Input
            label="Confirm Password"
            type={showConfirm ? "text" : "password"}
            placeholder="Repeat your password"
            icon={Lock}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            error={errors.confirmPassword}
            autoComplete="new-password"
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          {/* Password strength hint */}
          {password.length > 0 && (
            <div className="flex gap-1.5 items-center">
              {[...Array(4)].map((_, i) => {
                const strength =
                  password.length >= 12
                    ? 4
                    : password.length >= 10
                    ? 3
                    : password.length >= 8
                    ? 2
                    : password.length >= 6
                    ? 1
                    : 0;
                return (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor:
                        i < strength
                          ? strength <= 1
                            ? "#ef4444"
                            : strength <= 2
                            ? "#f97316"
                            : strength <= 3
                            ? "#eab308"
                            : "#22c55e"
                          : "var(--border)",
                    }}
                  />
                );
              })}
              <span className="text-xs text-slate-500 ml-1 w-12">
                {password.length >= 12
                  ? "Strong"
                  : password.length >= 8
                  ? "Fair"
                  : password.length >= 6
                  ? "Weak"
                  : ""}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? <Spinner size={18} /> : null}
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-slate-500 text-xs leading-relaxed">
            By creating an account, you agree to our{" "}
            <span className="text-slate-400">Terms of Service</span> and{" "}
            <span className="text-slate-400">Privacy Policy</span>.
          </p>
        </form>
      </div>

      {/* Login link */}
      <p className="text-center text-slate-400 text-sm mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
          Sign in
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