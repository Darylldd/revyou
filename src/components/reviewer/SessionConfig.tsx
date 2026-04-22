"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Brain, Zap, Layers, ChevronRight, FileText, Loader2, Library, CheckCircle } from "lucide-react";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DifficultyLevel, ReviewMode, Flashcard, MultipleChoiceQuestion, ReviewerFile, User } from "@/types";
import { isSupportedFile, getFileExtension, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
  preloadedText?: string;
  preloadedTitle?: string;
  onStart: (text: string, mode: ReviewMode, diff: DifficultyLevel, fc?: Flashcard[], q?: MultipleChoiceQuestion[]) => void;
  user: User | null;
}

const modes = [
  { id: "flashcard" as ReviewMode, label: "Flashcards", desc: "flip cards", icon: Brain, color: "#7c3aed", bg: "#ede9fe" },
  { id: "multiple-choice" as ReviewMode, label: "Quiz", desc: "4-choice", icon: Zap, color: "var(--blue)", bg: "var(--blue-light)" },
  { id: "combined" as ReviewMode, label: "Both", desc: "cards + quiz", icon: Layers, color: "var(--green)", bg: "var(--green-light)" },
];

const diffs = [
  { id: "easy" as DifficultyLevel, label: "Easy", desc: "definitions", color: "var(--green)", bg: "var(--green-light)", border: "#86efac" },
  { id: "medium" as DifficultyLevel, label: "Medium", desc: "concepts", color: "#d97706", bg: "#fef9c3", border: "#fde047" },
  { id: "hard" as DifficultyLevel, label: "Hard", desc: "analysis", color: "var(--red)", bg: "var(--red-light)", border: "#fca5a5" },
];

function SectionLabel({ n, text }: { n: number; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{
        width: 20, height: 20, borderRadius: "50%",
        background: "var(--ink)", color: "var(--card)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>{n}</span>
      <span className="hand" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{text}</span>
    </div>
  );
}

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
      }))).catch(console.error).finally(() => setLoadingFiles(false));
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
      const ex = await fetch("/api/extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, fileType: getFileExtension(file.name), fileName: file.name }),
      });
      if (!ex.ok) { const e = await ex.json(); throw new Error(e.error ?? "Failed"); }
      const { extractedText } = await ex.json();
      setText(extractedText); setFileName(file.name); setSelectedId(null);
      toast.success("File processed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally { setUploading(false); setUploadMsg(""); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop, multiple: false, disabled: uploading || generating,
  });

  async function handleGenerate() {
    if (!hasText) { toast.error("Upload a file first."); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedText: text, mode, difficulty: diff, itemCount: count }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      const data = await res.json();
      if (mode === "multiple-choice" && !data.questions?.length) throw new Error("No questions generated.");
      if (mode === "flashcard" && !data.flashcards?.length) throw new Error("No flashcards generated.");
      onStart(text, mode, diff, data.flashcards, data.questions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally { setGenerating(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
    

      {/* Main — constrained, no scroll on desktop */}
      <div style={{
        flex: 1, padding: "20px",
        maxWidth: 1000, width: "100%", margin: "0 auto",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        <div style={{ marginBottom: 4 }}>
          <h1 className="hand" style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>set up your review</h1>
          {!user && <p style={{ fontSize: 12, color: "var(--ink-4)" }}>no account — <a href="/signup" style={{ color: "var(--blue)" }}>sign in</a> to save progress</p>}
        </div>

        {/* Two-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, flex: 1 }}>

          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Step 1 — Upload */}
            <div className="ruled" style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderLeft: "3px solid var(--rule-red)", borderRadius: 3, padding: "14px 16px",
              flex: 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <SectionLabel n={1} text="your file" />
                {user && (
                  <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 3, overflow: "hidden" }}>
                    {(["upload", "library"] as const).map((t) => (
                      <button key={t} onClick={() => setTab(t)} style={{
                        padding: "3px 10px", fontSize: 11, fontWeight: 600,
                        background: tab === t ? "var(--blue)" : "transparent",
                        color: tab === t ? "#fff" : "var(--ink-3)",
                        border: "none", cursor: "pointer",
                        fontFamily: "var(--font-hand)",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        {t === "upload" ? <Upload size={10} /> : <Library size={10} />}
                        {t === "upload" ? "new" : "saved"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {hasText ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                  background: "var(--green-light)", border: "1px solid #86efac", borderRadius: 4,
                }}>
                  <CheckCircle size={14} style={{ color: "var(--green)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</p>
                    <p style={{ fontSize: 11, color: "var(--green)", margin: 0 }}>{text.length.toLocaleString()} chars</p>
                  </div>
                  <button onClick={() => { setText(""); setFileName(""); setSelectedId(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--red)", padding: 0 }}>
                    clear
                  </button>
                </div>
              ) : tab === "upload" ? (
                <div {...getRootProps()} style={{
                  border: `1.5px dashed ${isDragActive ? "var(--blue)" : "var(--border)"}`,
                  borderRadius: 3, padding: "20px 12px", textAlign: "center",
                  cursor: uploading ? "not-allowed" : "pointer",
                  background: isDragActive ? "var(--blue-dim)" : "rgba(255,255,255,0.5)",
                }}>
                  <input {...getInputProps()} />
                  {uploading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <Loader2 size={20} style={{ color: "var(--blue)" }} className="animate-spin" />
                      <p className="hand" style={{ fontSize: 14, color: "var(--blue)" }}>{uploadMsg}</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={20} style={{ color: "var(--ink-4)", margin: "0 auto 8px" }} />
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)", marginBottom: 2 }}>
                        {isDragActive ? "drop it" : "drag & drop or click"}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--ink-4)" }}>PDF · PPTX · DOCX · XLSX · PNG · JPG · HEIC</p>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {loadingFiles ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "16px 0", color: "var(--ink-4)" }}>
                      <Loader2 size={14} className="animate-spin" /> loading...
                    </div>
                  ) : savedFiles.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--ink-4)", padding: "16px 0" }}>
                      no files yet — <button onClick={() => setTab("upload")} style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", fontWeight: 600, padding: 0, fontSize: 13 }}>upload one</button>
                    </p>
                  ) : savedFiles.map((f) => (
                    <button key={f.id} onClick={() => { setSelectedId(f.id); setText(f.extractedText); setFileName(f.fileName); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                        background: selectedId === f.id ? "var(--blue-light)" : "var(--card-2)",
                        border: `1.5px solid ${selectedId === f.id ? "var(--blue)" : "var(--border)"}`,
                        borderRadius: 3, cursor: "pointer", textAlign: "left",
                      }}>
                      <FileText size={12} style={{ color: "var(--blue)", flexShrink: 0 }} />
                      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.fileName}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2 — Mode */}
            <div className="ruled" style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderLeft: "3px solid var(--rule-red)", borderRadius: 3, padding: "14px 16px",
            }}>
              <SectionLabel n={2} text="mode" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {modes.map((m) => (
                  <button key={m.id} onClick={() => setMode(m.id)} style={{
                    padding: "10px 6px", borderRadius: 3, cursor: "pointer",
                    border: `2px solid ${mode === m.id ? m.color : "var(--border)"}`,
                    background: mode === m.id ? m.bg : "var(--card)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}>
                    <m.icon size={16} style={{ color: mode === m.id ? m.color : "var(--ink-4)" }} />
                    <span className="hand" style={{ fontSize: 13, fontWeight: 700, color: mode === m.id ? m.color : "var(--ink-2)" }}>{m.label}</span>
                    <span style={{ fontSize: 10, color: "var(--ink-4)" }}>{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Step 3 — Difficulty */}
            <div className="ruled" style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderLeft: "3px solid var(--rule-red)", borderRadius: 3, padding: "14px 16px",
            }}>
              <SectionLabel n={3} text="difficulty" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {diffs.map((d) => (
                  <button key={d.id} onClick={() => setDiff(d.id)} style={{
                    padding: "10px 6px", borderRadius: 3, cursor: "pointer",
                    border: `2px solid ${diff === d.id ? d.border : "var(--border)"}`,
                    background: diff === d.id ? d.bg : "var(--card)",
                  }}>
                    <div className="hand" style={{ fontSize: 14, fontWeight: 700, color: diff === d.id ? d.color : "var(--ink-2)", marginBottom: 2 }}>{d.label}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-4)" }}>{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4 — Count */}
            <div className="ruled" style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderLeft: "3px solid var(--rule-red)", borderRadius: 3, padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <SectionLabel n={4} text="items" />
                <span className="hand" style={{ fontSize: 22, fontWeight: 700, color: "var(--blue)" }}>{count}</span>
              </div>
              <input type="range" min={5} max={30} step={5} value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--blue)" }} />
              <p style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
                {mode === "combined" ? `${Math.ceil(count / 2)} cards + ${Math.floor(count / 2)} questions` : `${count} ${mode === "flashcard" ? "flashcards" : "questions"}`}
              </p>
            </div>

            {/* Generate */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              {!hasText && (
                <p style={{ fontSize: 12, color: "var(--ink-4)", textAlign: "center", marginBottom: 8, fontStyle: "italic" }}>
                  upload a file on the left to get started
                </p>
              )}
              <button
                onClick={handleGenerate}
                disabled={!hasText || generating || uploading}
                className="btn-primary"
                style={{
                  width: "100%", justifyContent: "center",
                  padding: "14px 20px", fontSize: 17,
                  opacity: !hasText ? 0.45 : 1,
                }}
              >
                {generating
                  ? <><Loader2 size={16} className="animate-spin" /> generating...</>
                  : <>generate <ChevronRight size={16} /></>
                }
              </button>
              {generating && (
                <p style={{ textAlign: "center", fontSize: 11, color: "var(--ink-4)", marginTop: 6 }}>
                  reading your material — 5 to 15 seconds
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}