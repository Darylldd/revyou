"use client";

import { useState } from "react";
import { X, GitMerge, Loader2 } from "lucide-react";
import { useReviewers } from "@/hooks/useReviewers";
import type { ReviewerFile } from "@/types";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Props { open: boolean; onClose: () => void; files: ReviewerFile[]; }

export default function CombineModal({ open, onClose, files }: Props) {
  const router = useRouter();
  const { createReviewer } = useReviewers();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCombine() {
    if (!title.trim()) { toast.error("Enter a title."); return; }
    if (selectedIds.size < 1) { toast.error("Select at least one file."); return; }
    setLoading(true);
    try {
      const selected = files.filter((f) => selectedIds.has(f.id));
      const combinedText = selected.map((f) => `=== ${f.fileName} ===\n${f.extractedText}`).join("\n\n");
      const id = await createReviewer(title.trim(), Array.from(selectedIds), combinedText, description.trim());
      toast.success("Reviewer created!");
      onClose();
      router.push(`/review?reviewerId=${id}`);
    } catch { toast.error("Failed to create reviewer."); }
    finally { setLoading(false); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, background: "rgba(0,0,0,0.45)",
    }}>
      <div style={{
        width: "100%", maxWidth: 500,
        background: "var(--card)", border: "1.5px solid var(--border)",
        borderRadius: 4, boxShadow: "4px 6px 0 var(--border-2)",
        display: "flex", flexDirection: "column", maxHeight: "85vh",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border-2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <GitMerge size={16} style={{ color: "var(--blue)" }} />
            <span className="hand" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
              combine reviewers
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-4)", padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="hand" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>
              title
            </label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Combined Reviewer"
              style={{
                width: "100%", background: "var(--card-2)",
                border: "1.5px solid var(--border)", borderRadius: 4,
                padding: "8px 12px", fontSize: 13, color: "var(--ink)",
                fontFamily: "var(--font-sans)", outline: "none",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "var(--blue)"}
              onBlur={(e) => e.currentTarget.style.borderColor = "var(--border)"}
            />
          </div>

          <div>
            <label className="hand" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>
              description <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ink-4)" }}>(optional)</span>
            </label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="what topics does this cover?"
              rows={2}
              style={{
                width: "100%", background: "var(--card-2)",
                border: "1.5px solid var(--border)", borderRadius: 4,
                padding: "8px 12px", fontSize: 13, color: "var(--ink)",
                fontFamily: "var(--font-sans)", outline: "none", resize: "none",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "var(--blue)"}
              onBlur={(e) => e.currentTarget.style.borderColor = "var(--border)"}
            />
          </div>

          <div>
            <label className="hand" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 8 }}>
              select files <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ink-4)" }}>({selectedIds.size} selected)</span>
            </label>
            {files.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-4)", padding: "20px 0", textAlign: "center" }}>
                No files uploaded yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {files.map((f) => {
                  const sel = selectedIds.has(f.id);
                  return (
                    <button key={f.id} onClick={() => toggle(f.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", borderRadius: 4, cursor: "pointer", textAlign: "left",
                        background: sel ? "var(--blue-light)" : "var(--card-2)",
                        border: `1.5px solid ${sel ? "var(--blue)" : "var(--border)"}`,
                        transition: "all .12s",
                      }}>
                      {/* Checkbox */}
                      <div style={{
                        width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                        border: `2px solid ${sel ? "var(--blue)" : "var(--border)"}`,
                        background: sel ? "var(--blue)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {sel && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.fileName}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--ink-4)", margin: 0 }}>
                          {f.extractedText.length.toLocaleString()} chars
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", gap: 8, padding: "14px 20px",
          borderTop: "1px solid var(--border-2)",
        }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, justifyContent: "center" }}>
            cancel
          </button>
          <button onClick={handleCombine} disabled={loading || selectedIds.size === 0 || !title.trim()}
            className="btn-primary"
            style={{ flex: 1, justifyContent: "center", opacity: (!title.trim() || selectedIds.size === 0) ? 0.5 : 1 }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
            {loading ? "creating..." : "combine & review"}
          </button>
        </div>
      </div>
    </div>
  );
}