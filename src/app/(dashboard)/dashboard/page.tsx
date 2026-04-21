"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, Play, Calendar, FileText, Loader2, GitMerge, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useReviewers, useReviewerFiles } from "@/hooks/useReviewers";
import { formatDate, truncate } from "@/lib/utils";
import type { Reviewer } from "@/types";
import toast from "react-hot-toast";
import CombineModal from "@/components/reviewer/CombineModal";

const STICKY_COLORS = [
  { bg: "var(--sticky-y)", border: "rgba(0,0,0,0.1)" },
  { bg: "var(--sticky-p)", border: "rgba(0,0,0,0.08)" },
  { bg: "var(--sticky-b)", border: "rgba(0,0,0,0.08)" },
  { bg: "var(--sticky-g)", border: "rgba(0,0,0,0.08)" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { reviewers, loading: rLoading, deleteReviewer } = useReviewers();
  const { files, loading: fLoading } = useReviewerFiles();
  const [combineOpen, setCombineOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(r: Reviewer) {
    if (!confirm(`Delete "${r.title}"?`)) return;
    setDeletingId(r.id);
    try { await deleteReviewer(r.id); toast.success("Deleted."); }
    catch { toast.error("Failed to delete."); }
    finally { setDeletingId(null); }
  }

  const isLoading = rLoading || fLoading;

  return (
    <div style={{ width: "100%" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="hand" style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>
          hey {user?.displayName?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)" }}>
          {reviewers.length} reviewer{reviewers.length !== 1 ? "s" : ""} · {files.length} file{files.length !== 1 ? "s" : ""} saved
        </p>
      </div>

     <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
  <Link href="/review" className="btn-primary">
    <Plus size={14} /> new review
  </Link>
  <button onClick={() => setCombineOpen(true)} className="btn-secondary">
    <GitMerge size={13} /> combine files
  </button>
</div>

      {/* Stats */}
   <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 28 }}>
        {[
          { label: "reviewers", value: reviewers.length, color: "var(--blue)" },
          { label: "files uploaded", value: files.length, color: "var(--green)" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 3, padding: "14px 16px",
            boxShadow: "2px 3px 0 var(--border-2)",
          }}>
            <p className="hand" style={{ fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: 2 }}>{s.value}</p>
            <p style={{ fontSize: 12, color: "var(--ink-3)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Reviewers */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 className="hand" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>my reviewers</h2>
        <Link href="/dashboard/reviewers" style={{ fontSize: 13, color: "var(--blue)", textDecoration: "none" }}>view all →</Link>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "40px 0", color: "var(--ink-4)" }}>
          <Loader2 size={18} className="animate-spin" /> loading...
        </div>
      ) : reviewers.length === 0 ? (
        <div className="ruled" style={{
          border: "1px solid var(--border)", borderLeft: "3px solid var(--rule-red)",
          borderRadius: 3, padding: "40px 24px", textAlign: "center",
          boxShadow: "2px 3px 0 var(--border-2)",
        }}>
          <p className="hand" style={{ fontSize: 20, color: "var(--ink-2)", marginBottom: 8 }}>nothing here yet</p>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>
            upload a file and generate your first reviewer to get started
          </p>
          <Link href="/review" className="btn-primary"><Plus size={14} /> create first</Link>
        </div>
      ) : (
     <div className="reviewer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, width: "100%" }}>
  {reviewers.slice(0, 8).map((r, i) => {
            const s = STICKY_COLORS[i % STICKY_COLORS.length];
            return (
              <div key={r.id} style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 3,
                padding: "16px",
                boxShadow: "2px 3px 0 rgba(0,0,0,0.06)",
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <h3 className="hand" style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>
                    {truncate(r.title, 45)}
                  </h3>
                  <button onClick={() => handleDelete(r)} disabled={deletingId === r.id}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-4)", padding: 0, flexShrink: 0 }}>
                    {deletingId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--ink-3)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <FileText size={10} /> {r.fileIds.length} file{r.fileIds.length !== 1 ? "s" : ""}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Calendar size={10} /> {formatDate(r.updatedAt)}
                  </span>
                </div>

                <Link href={`/review?reviewerId=${r.id}`} className="btn-primary"
                  style={{ fontSize: 13, justifyContent: "center" }}>
                  <Play size={11} /> study this
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <CombineModal open={combineOpen} onClose={() => setCombineOpen(false)} files={files} />
    </div>
  );
}