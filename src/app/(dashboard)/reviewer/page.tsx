"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Play,
  Trash2,
  Search,
  Plus,
  Calendar,
  FileText,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { useReviewers } from "@/hooks/useReviewers";
import { formatDate, truncate } from "@/lib/utils";
import type { Reviewer } from "@/types";
import toast from "react-hot-toast";

export default function ReviewersPage() {
  const { reviewers, loading, deleteReviewer } = useReviewers();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = reviewers.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleDelete(reviewer: Reviewer) {
    if (!confirm(`Delete "${reviewer.title}"?`)) return;
    setDeletingId(reviewer.id);
    try {
      await deleteReviewer(reviewer.id);
      toast.success("Reviewer deleted.");
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Reviewers</h1>
          <p className="text-slate-400 text-sm mt-1">
            {reviewers.length} saved reviewer{reviewers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/review"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
        >
          <Plus size={15} />
          New
        </Link>
      </div>

      {/* Search */}
      {reviewers.length > 0 && (
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviewers..."
            className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              borderColor: "rgba(255,255,255,0.1)",
            }}
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-violet-400 w-7 h-7" />
        </div>
      ) : reviewers.length === 0 ? (
        <div
          className="rounded-2xl border p-12 flex flex-col items-center text-center"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <FolderOpen className="text-slate-600 w-14 h-14 mb-4" />
          <p className="text-white font-semibold text-lg mb-1">No reviewers yet</p>
          <p className="text-slate-400 text-sm mb-6 max-w-sm">
            Create your first reviewer by uploading a file and generating flashcards or quizzes.
          </p>
          <Link
            href="/review"
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all active:scale-95"
          >
            <Plus size={15} />
            Create First Reviewer
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No reviewers match &quot;{search}&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((reviewer) => (
            <div
              key={reviewer.id}
              className="rounded-2xl border p-5 flex flex-col gap-4 hover:border-violet-500/30 transition-all"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: "rgba(124,58,237,0.15)" }}
                  >
                    <BookOpen className="text-violet-400 w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{reviewer.title}</h3>
                    {reviewer.description && (
                      <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">
                        {truncate(reviewer.description, 100)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(reviewer)}
                  disabled={deletingId === reviewer.id}
                  className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  {deletingId === reviewer.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>

              {reviewer.tags && reviewer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {reviewer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full text-violet-300"
                      style={{ backgroundColor: "rgba(124,58,237,0.15)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <FileText size={11} />
                  {reviewer.fileIds.length} file{reviewer.fileIds.length !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {formatDate(reviewer.updatedAt)}
                </span>
              </div>

              <Link
                href={`/review?reviewerId=${reviewer.id}`}
                className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-all active:scale-95"
              >
                <Play size={14} />
                Start Reviewing
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}