"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import GoogleIcon from "@/components/ui/GoogleIcon";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = "at least 2 characters";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = "invalid email";
    if (!pw || pw.length < 6) e.pw = "at least 6 characters";
    if (pw !== cf) e.cf = "passwords don't match";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSignup(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const cred = await signUpWithEmail(email, pw);
      await updateProfile(cred.user, { displayName: name.trim() });
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid, email: cred.user.email,
        displayName: name.trim(), photoURL: null,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      toast.success("Account created!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-in-use") setErrors((p) => ({ ...p, email: "already registered" }));
      else toast.error("Sign up failed.");
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    setGLoading(true);
    try {
      const cred = await signInWithGoogle();
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid, email: cred.user.email,
        displayName: cred.user.displayName, photoURL: cred.user.photoURL,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user") toast.error("Google sign-in failed.");
    } finally { setGLoading(false); }
  }

  const strength = pw.length >= 12 ? 4 : pw.length >= 10 ? 3 : pw.length >= 8 ? 2 : pw.length >= 6 ? 1 : 0;
  const sColors = ["var(--border-2)", "#dc2626", "#d97706", "#ca8a04", "#16a34a"];
  const sLabels = ["", "weak", "fair", "good", "strong"];

  return (
    <div style={{ width: "100%", maxWidth: 420 }} className="fade-up">
      <div style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 3, padding: "32px",
        boxShadow: "3px 4px 0 var(--border-2)",
        position: "relative",
      }} className="tape">
        <h1 className="hand" style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
          create account
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}>free forever — no credit card</p>

        <button onClick={handleGoogle} disabled={gLoading || loading} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, padding: "9px 16px",
          background: "var(--card-2)", border: "1.5px solid var(--border)",
          borderRadius: 4, fontSize: 13, fontWeight: 500,
          color: "var(--ink-2)", cursor: "pointer", marginBottom: 20,
        }}>
          {gLoading ? <Spinner size={16} /> : <GoogleIcon size={16} />}
          continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: "1.5px", background: "var(--border-2)" }} />
          <span className="hand" style={{ fontSize: 14, color: "var(--ink-4)" }}>or</span>
          <div style={{ flex: 1, height: "1.5px", background: "var(--border-2)" }} />
        </div>

        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <Input label="Name" type="text" placeholder="Juan dela Cruz" icon={User}
            value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
            error={errors.name} />
          <Input label="Email" type="email" placeholder="you@example.com" icon={Mail}
            value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
            error={errors.email} />
          <div>
            <Input label="Password" type={showPw ? "text" : "password"} placeholder="min. 6 characters" icon={Lock}
              value={pw} onChange={(e) => { setPw(e.target.value); setErrors((p) => ({ ...p, pw: "" })); }}
              error={errors.pw}
              rightElement={<button type="button" onClick={() => setShowPw((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-4)", padding: 0 }}>{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>} />
            {pw.length > 0 && (
              <div style={{ display: "flex", gap: 3, alignItems: "center", marginTop: 6 }}>
                {[1,2,3,4].map((i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? sColors[strength] : "var(--border-2)", transition: "background .2s" }} />
                ))}
                <span className="hand" style={{ fontSize: 13, color: "var(--ink-3)", marginLeft: 6, minWidth: 36 }}>{sLabels[strength]}</span>
              </div>
            )}
          </div>
          <Input label="Confirm password" type={showCf ? "text" : "password"} placeholder="repeat password" icon={Lock}
            value={cf} onChange={(e) => { setCf(e.target.value); setErrors((p) => ({ ...p, cf: "" })); }}
            error={errors.cf}
            rightElement={<button type="button" onClick={() => setShowCf((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-4)", padding: 0 }}>{showCf ? <EyeOff size={14} /> : <Eye size={14} />}</button>} />
          <button type="submit" disabled={loading || gLoading} style={{
            background: "var(--blue)", color: "#fff", border: "none", borderRadius: 4,
            padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            opacity: loading ? 0.7 : 1, marginTop: 4,
          }}>
            {loading ? <Spinner size={15} /> : null}
            {loading ? "creating..." : "create account"}
          </button>
        </form>
      </div>
      <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--ink-3)" }}>
        already have an account?{" "}
        <Link href="/login" style={{ color: "var(--blue)", fontWeight: 600 }}>sign in</Link>
      </div>
    </div>
  );
}