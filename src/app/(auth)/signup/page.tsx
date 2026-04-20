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
import GoogleIcon from "@/components/ui/GoogleIcon";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!displayName.trim() || displayName.trim().length < 2) e.displayName = "Name must be at least 2 characters.";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email.";
    if (!password || password.length < 6) e.password = "Password must be at least 6 characters.";
    if (password !== confirm) e.confirm = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignup(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const cred = await signUpWithEmail(email, password);
      await updateProfile(cred.user, { displayName: displayName.trim() });
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid, email: cred.user.email,
        displayName: displayName.trim(), photoURL: null,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      toast.success("Welcome to RevYouw!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-in-use") setErrors((p) => ({ ...p, email: "Email already registered." }));
      else toast.error("Sign up failed.");
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const cred = await signInWithGoogle();
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid, email: cred.user.email,
        displayName: cred.user.displayName, photoURL: cred.user.photoURL,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success("Welcome!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user") toast.error("Google sign-in failed.");
    } finally { setGoogleLoading(false); }
  }

  const strength = password.length >= 12 ? 4 : password.length >= 10 ? 3 : password.length >= 8 ? 2 : password.length >= 6 ? 1 : 0;
  const strengthColors = ["#3d2318", "#dc2626", "#d97706", "#d4890a", "#4ade80"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div
        className="rounded-2xl p-8 border"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-warm)" }}
      >
        <div className="mb-8 text-center">
          <h1 className="font-serif font-bold text-3xl mb-1.5" style={{ color: "var(--text)" }}>
            Open your library
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Free forever. Start studying smarter tonight.
          </p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border font-medium text-sm transition-all hover:border-amber-500/50 active:scale-95 disabled:opacity-50 mb-6"
          style={{ borderColor: "var(--border-warm)", backgroundColor: "var(--surface2)", color: "var(--text-warm)" }}
        >
          {googleLoading ? <Spinner size={18} /> : <GoogleIcon size={18} />}
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
          <span className="text-xs font-serif italic" style={{ color: "var(--text-faint)" }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <Input label="Full Name" type="text" placeholder="Juan dela Cruz" icon={User}
            value={displayName} onChange={(e) => { setDisplayName(e.target.value); setErrors((p) => ({ ...p, displayName: undefined as unknown as string })); }}
            error={errors.displayName} />
          <Input label="Email" type="email" placeholder="you@example.com" icon={Mail}
            value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined as unknown as string })); }}
            error={errors.email} />
          <div className="flex flex-col gap-1.5">
            <Input label="Password" type={showPw ? "text" : "password"} placeholder="Min. 6 characters" icon={Lock}
              value={password} onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined as unknown as string })); }}
              error={errors.password}
              rightElement={<button type="button" onClick={() => setShowPw((v) => !v)} style={{ color: "var(--text-muted)" }}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>} />
            {password.length > 0 && (
              <div className="flex gap-1 items-center">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{ backgroundColor: i <= strength ? strengthColors[strength] : "var(--border)" }} />
                ))}
                <span className="text-xs ml-1 w-12" style={{ color: "var(--text-muted)" }}>{strengthLabels[strength]}</span>
              </div>
            )}
          </div>
          <Input label="Confirm Password" type={showCf ? "text" : "password"} placeholder="Repeat your password" icon={Lock}
            value={confirm} onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: undefined as unknown as string })); }}
            error={errors.confirm}
            rightElement={<button type="button" onClick={() => setShowCf((v) => !v)} style={{ color: "var(--text-muted)" }}>{showCf ? <EyeOff size={15} /> : <Eye size={15} />}</button>} />

          <button
            type="submit" disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 mt-1"
            style={{ backgroundColor: "var(--amber)", color: "#080604", boxShadow: "0 4px 20px rgba(212,137,10,0.3)" }}
          >
            {loading ? <Spinner size={16} /> : null}
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm mt-5" style={{ color: "var(--text-muted)" }}>
        Already have an account?{" "}
        <Link href="/login" className="font-semibold" style={{ color: "var(--amber)" }}>Sign in →</Link>
      </p>
    </div>
  );
}