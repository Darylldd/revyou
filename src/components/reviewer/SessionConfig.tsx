"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Brain, Zap, Layers, ChevronRight, FileText, Loader2, Hash, Library, CheckCircle } from "lucide-react";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DifficultyLevel, ReviewMode, Flashcard, MultipleChoiceQuestion, ReviewerFile, User } from "@/types";
import { isSupportedFile, getFileExtension, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
  preloadedText?: string;
  preloadedTitle?: string;
  onStart: (text: string, mode: ReviewMode, difficulty: DifficultyLevel, flashcards?: Flashcard[], questions?: MultipleChoiceQuestion[]) => void;
  user: User | null;
}

const modes = [
  { id: "flashcard" as ReviewMode, label: "Flashcards", desc: "flip cards, test memory", icon: Brain, color: "#7c3aed", bg: "#ede9fe" },
  { id: "multiple-choice" as ReviewMode, label: "Quiz", desc: "4-choice questions", icon: Zap, color: "var(--blue)", bg: "var(--blue-light)" },
  { id: "combined" as ReviewMode, label: "Both", desc: "flashcards then quiz", icon: Layers, color: "var(--green)", bg: "var(--green-light)" },
];

const diffs = [
  { id: "easy" as DifficultyLevel, label: "Easy", desc: "definitions & recall", color: "var(--green)", bg: "var(--green-light)", border: "#86efac" },
  { id: "medium" as DifficultyLevel, label: "Medium", desc: "concepts & application", color: "#d97706", bg: "#fef9c3", border: "#fde047" },
  { id: "hard" as DifficultyLevel, label: "Hard", desc: "analysis & synthesis", color: "var(--red)", bg: "var(--red-light)", border: "#fca5a5" },
];

export default function SessionConfig({ preloadedText, preloadedTitle, onStart, user }: Props) {
  const [text, setText] = useState(preloadedText ?? "");
  const [fileName, setFileName] = useState(preloadedTitle ?? "");
  const [mode, setMode] = useState<ReviewMode>("flashcard");
  const [diff, setDiff] = useState<DifficultyLevel>("medium");
  const [count, setCount] = useState(10);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [tab, setTab] = useState<"upload" | "library">("upload");
  const [savedFiles, setSavedFiles] = useState<ReviewerFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const hasText = text.trim().length > 50;

  useEffect(() => {
    if (tab !== "library" || !user || savedFiles.length > 0) return;
    setLoadingFiles(true);
    getDocs(query(collection(db, "reviewerFiles"), where("userId", "==", user.uid), orderBy("createdAt", "desc")))
      .then((snap) => setSavedFiles(snap.docs.map((d) => {
        const raw = d.data();
        return { ...raw, id: d.id, createdAt: raw.createdAt instanceof Timestamp ? raw.createdAt.toDate() : new Date() } as ReviewerFile;
      })))
      .catch(console.error)
      .finally(() => setLoadingFiles(false));
  }, [tab, user, savedFiles.length]);

  const handleDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!isSupportedFile(file.name)) { toast.error("Unsupported file type."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB."); return; }
    setUploading(true); setUploadMsg("uploading...");
    try {
      const fd = new FormData(); fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) throw new Error("Upload failed");
      const { url } = await up.json();
      setUploadMsg("extracting text...");
      const ex = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, fileType: getFileExtension(file.name), fileName: file.name }) });
      if (!ex.ok) { const e = await ex.json(); throw new Error(e.error ?? "Extraction failed"); }
      const { extractedText } = await ex.json();
      setText(extractedText); setFileName(file.name); setSelectedId(null);
      toast.success("File processed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally { setUploading(false); setUploadMsg(""); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: handleDrop, multiple: false, disabled: uploading || generating });

  async function handleGenerate() {
    if (!hasText) { toast.error("Upload a file first."); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ extractedText: text, mode, difficulty: diff, itemCount: count }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      const data = await res.json();
      if (mode === "multiple-choice" && !data.questions?.length) throw new Error("No questions generated. Try again.");
      if (mode === "flashcard" && !data.flashcards?.length) throw new Error("No flashcards generated. Try again.");
      onStart(text, mode, diff, data.flashcards, data.questions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally { setGenerating(false); }
  }

  const label = (s: string, n?: number) => (
    <span className="hand" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: n ? 8 : 0 }}>
      {n && <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--blue)", color: "#fff", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>}
      {s}
    </span>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <h1 className="hand" style={{ fontSize: 30, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
          set up your review
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)" }}>
          upload your material and pick how you want to study
          {!user && <> · <a href="/login" style={{ color: "var(--blue)" }}>sign in</a> to save progress</>}
        </p>
      </div>

      {/* Step 1 — Upload */}
      <div className="ruled" style={{ border: "1px solid var(--border)", borderLeft: "3px solid var(--rule-red)", borderRadius: 3, padding: "20px 24px", background: "var(--card)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          {label("upload your file", 1)}
          {user && (
            <div style={{ display: "flex", border: "1.5px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
              {(["upload", "library"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "4px 12px", fontSize: 12, fontWeight: 600,
                  background: tab === t ? "var(--blue)" : "transparent",
                  color: tab === t ? "#fff" : "var(--ink-3)",
                  border: "none", cursor: "pointer", fontFamily: "var(--font-hand)",
                }}>
                  {t === "upload" ? "upload new" : "my library"}
                </button>
              ))}
            </div>
          )}
        </div>

        {hasText ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--green-light)", border: "1px solid #86efac", borderRadius: 4 }}>
            <CheckCircle size={15} style={{ color: "var(--green)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: 0 }}>{fileName || "File loaded"}</p>
              <p style={{ fontSize: 11, color: "var(--green)", margin: 0 }}>{text.length.toLocaleString()} characters extracted</p>
            </div>
            <button onClick={() => { setText(""); setFileName(""); setSelectedId(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--red)" }}>clear</button>
          </div>
        ) : tab === "upload" ? (
          <div {...getRootProps()} style={{
            border: `2px dashed ${isDragActive ? "var(--blue)" : "var(--border)"}`,
            borderRadius: 4, padding: "28px", textAlign: "center", cursor: uploading ? "not-allowed" : "pointer",
            background: isDragActive ? "var(--blue-dim)" : "rgba(255,255,255,0.5)", transition: "all .15s",
          }}>
            <input {...getInputProps()} />
            {uploading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <Loader2 size={24} style={{ color: "var(--blue)" }} className="animate-spin" />
                <p className="hand" style={{ fontSize: 15, color: "var(--blue)" }}>{uploadMsg}</p>
              </div>
            ) : (
              <>
                <Upload size={22} style={{ color: "var(--ink-4)", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-2)", marginBottom: 4 }}>
                  {isDragActive ? "drop it!" : "drag & drop or click to browse"}
                </p>
                <p style={{ fontSize: 11, color: "var(--ink-4)" }}>PDF · PPTX · DOCX · XLSX · PNG · JPG · HEIC · TXT · max 10MB</p>
              </>
            )}
          </div>
        ) : (
          <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {loadingFiles ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "20px 0", color: "var(--ink-4)" }}>
                <Loader2 size={16} className="animate-spin" /> loading...
              </div>
            ) : savedFiles.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-4)", padding: "20px 0" }}>no files yet — <button onClick={() => setTab("upload")} style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", fontWeight: 600, padding: 0, fontSize: 13 }}>upload one</button></p>
            ) : savedFiles.map((f) => (
              <button key={f.id} onClick={() => { setSelectedId(f.id); setText(f.extractedText); setFileName(f.fileName); toast.success(`"${f.fileName}" loaded!`); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                  background: selectedId === f.id ? "var(--blue-light)" : "var(--card-2)",
                  border: `1.5px solid ${selectedId === f.id ? "var(--blue)" : "var(--border)"}`,
                  borderRadius: 4, cursor: "pointer", textAlign: "left",
                }}>
                <FileText size={14} style={{ color: "var(--blue)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.fileName}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-4)", margin: 0 }}>{formatDate(f.createdAt)}</p>
                </div>
                {selectedId === f.id && <CheckCircle size={14} style={{ color: "var(--blue)" }} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2 — Mode */}
      <div className="ruled" style={{ border: "1px solid var(--border)", borderLeft: "3px solid var(--rule-red)", borderRadius: 3, padding: "20px 24px", background: "var(--card)" }}>
        {label("choose mode", 2)}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
          {modes.map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
              padding: "12px 8px", borderRadius: 4, cursor: "pointer",
              border: `2px solid ${mode === m.id ? m.color : "var(--border)"}`,
              background: mode === m.id ? m.bg : "var(--card)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              transition: "all .15s",
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 4, background: m.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <m.icon size={16} style={{ color: m.color }} />
              </div>
              <span className="hand" style={{ fontSize: 14, fontWeight: 700, color: mode === m.id ? m.color : "var(--ink-2)" }}>{m.label}</span>
              <span style={{ fontSize: 11, color: "var(--ink-4)", textAlign: "center", lineHeight: 1.3 }}>{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3 — Difficulty */}
      <div className="ruled" style={{ border: "1px solid var(--border)", borderLeft: "3px solid var(--rule-red)", borderRadius: 3, padding: "20px 24px", background: "var(--card)" }}>
        {label("difficulty", 3)}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
          {diffs.map((d) => (
            <button key={d.id} onClick={() => setDiff(d.id)} style={{
              padding: "10px 8px", borderRadius: 4, cursor: "pointer",
              border: `2px solid ${diff === d.id ? d.border : "var(--border)"}`,
              background: diff === d.id ? d.bg : "var(--card)",
              transition: "all .15s",
            }}>
              <div className="hand" style={{ fontSize: 15, fontWeight: 700, color: diff === d.id ? d.color : "var(--ink-2)", marginBottom: 2 }}>{d.label}</div>
              <div style={{ fontSize: 11, color: "var(--ink-4)" }}>{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 4 — Count */}
      <div className="ruled" style={{ border: "1px solid var(--border)", borderLeft: "3px solid var(--rule-red)", borderRadius: 3, padding: "20px 24px", background: "var(--card)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {label("how many items?", 4)}
          <div style={{
            width: 44, height: 36, borderRadius: 4, background: "var(--blue-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span className="hand" style={{ fontSize: 20, fontWeight: 700, color: "var(--blue)" }}>{count}</span>
          </div>
        </div>
        <input type="range" min={5} max={30} step={5} value={count} onChange={(e) => setCount(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--blue)", marginTop: 12 }} />
        <p style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
          {mode === "combined" ? `${Math.ceil(count / 2)} flashcards + ${Math.floor(count / 2)} questions` : `${count} ${mode === "flashcard" ? "flashcards" : "questions"}`}
        </p>
      </div>

      {/* Generate */}
      <button onClick={handleGenerate} disabled={!hasText || generating || uploading}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "14px", borderRadius: 4, fontSize: 16, fontWeight: 700,
          background: hasText ? "var(--blue)" : "var(--border)",
          color: hasText ? "#fff" : "var(--ink-4)",
          border: "none", cursor: hasText ? "pointer" : "not-allowed",
          fontFamily: "var(--font-hand)", letterSpacing: "0.01em",
          transition: "all .15s",
          boxShadow: hasText ? "3px 4px 0 rgba(37,99,235,0.3)" : "none",
        }}>
        {generating ? <><Loader2 size={18} className="animate-spin" /> generating — hang tight...</> : <>generate & start studying <ChevronRight size={18} /></>}
      </button>
      {generating && <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-4)", marginTop: -8 }}>AI is reading your material — 5–15 seconds...</p>}
    </div>
  );
}