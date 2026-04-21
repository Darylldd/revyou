"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Play, Trash2, Search, Plus, Calendar, FileText, Loader2 } from "lucide-react";
import { useReviewers } from "@/hooks/useReviewers";
import { formatDate, truncate } from "@/lib/utils";
import type { Reviewer } from "@/types";
import toast from "react-hot-toast";

export default function ReviewersPage() {
  const { reviewers, loading, deleteReviewer } = useReviewers();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = reviewers.filter(
    (r) => r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(r: Reviewer) {
    if (!confirm(`Delete "${r.title}"?`)) return;
    setDeletingId(r.id);
    try { await deleteReviewer(r.id); toast.success("Deleted."); }
    catch { toast.error("Failed."); }
    finally { setDeletingId(null); }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 className="hand" style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)" }}>my notes</h1>
          <p style={{ fontSize: 13, color: "var(--ink-3)" }}>{reviewers.length} saved</p>
        </div>
        <Link href="/review" style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          background: "var(--blue)", color: "#fff",
          padding: "7px 14px", borderRadius: 4,
          fontSize: 13, fontWeight: 600, textDecoration: "none",
        }}>
          <Plus size={13} /> new
        </Link>
      </div>

      {reviewers.length > 0 && (
        <div style={{ position: "relative", marginBottom: 20 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)" }} />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="search reviewers..."
            style={{
              width: "100%", background: "var(--card)", border: "1.5px solid var(--border)",
              borderRadius: 4, padding: "8px 12px 8px 30px", fontSize: 13, color: "var(--ink)",
              fontFamily: "var(--font-sans)", outline: "none",
            }}
          />
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-4)", padding: "40px 0" }}>
          <Loader2 size={18} className="animate-spin" /> loading...
        </div>
      ) : reviewers.length === 0 ? (
        <div className="ruled" style={{
          border: "1px solid var(--border)", borderLeft: "3px solid var(--rule-red)",
          borderRadius: 3, padding: "40px 24px", textAlign: "center",
        }}>
          <BookOpen size={28} style={{ color: "var(--ink-5)", margin: "0 auto 12px" }} />
          <p className="hand" style={{ fontSize: 18, color: "var(--ink-2)", marginBottom: 8 }}>no reviewers yet</p>
          <Link href="/review" style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "var(--blue)", color: "#fff",
            padding: "7px 16px", borderRadius: 4,
            fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>
            <Plus size={13} /> create first
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--ink-4)", fontSize: 13, padding: "20px 0" }}>no results for "{search}"</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {filtered.map((r) => (
            <div key={r.id} className="ruled" style={{
              border: "1px solid var(--border-2)",
              borderLeft: "3px solid var(--rule-red)",
              borderRadius: 3, padding: "14px 18px",
              display: "flex", alignItems: "center", gap: 12,
              background: "var(--card)",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="hand" style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>
                  {truncate(r.title, 60)}
                </p>
                <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--ink-4)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <FileText size={10} /> {r.fileIds.length} file{r.fileIds.length !== 1 ? "s" : ""}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Calendar size={10} /> {formatDate(r.updatedAt)}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <Link href={`/review?reviewerId=${r.id}`} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  background: "var(--blue)", color: "#fff",
                  padding: "5px 12px", borderRadius: 4,
                  fontSize: 12, fontWeight: 600, textDecoration: "none",
                }}>
                  <Play size={11} /> study
                </Link>
                <button onClick={() => handleDelete(r)} disabled={deletingId === r.id}
                  style={{
                    background: "none", border: "1.5px solid var(--border)", borderRadius: 4,
                    padding: "5px 8px", cursor: "pointer", color: "var(--red)", display: "flex", alignItems: "center",
                  }}>
                  {deletingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}