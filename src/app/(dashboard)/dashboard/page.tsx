"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Upload,
  Plus,
  Trash2,
  Play,
  Calendar,
  FileText,
  Loader2,
  FolderOpen,
  GitMerge,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useReviewers, useReviewerFiles } from "@/hooks/useReviewers";
import { formatDate, truncate } from "@/lib/utils";
import type { Reviewer } from "@/types";
import toast from "react-hot-toast";
import CombineModal from "@/components/reviewer/CombineModal";

export default function DashboardPage() {
  const { user } = useAuth();
  const { reviewers, loading: rLoading, deleteReviewer } = useReviewers();
  const { files, loading: fLoading } = useReviewerFiles();
  const [combineOpen, setCombineOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(reviewer: Reviewer) {
    if (!confirm(`Delete "${reviewer.title}"? This cannot be undone.`)) return;
    setDeletingId(reviewer.id);
    try {
      await deleteReviewer(reviewer.id);
      toast.success("Reviewer deleted.");
    } catch {
      toast.error("Failed to delete reviewer.");
    } finally {
      setDeletingId(null);
    }
  }

  const stats = [
    {
      label: "Saved Reviewers",
      value: reviewers.length,
      icon: BookOpen,
      color: "text-violet-400",
      bg: "rgba(124,58,237,0.15)",
    },
    {
      label: "Uploaded Files",
      value: files.length,
      icon: FileText,
      color: "text-blue-400",
      bg: "rgba(59,130,246,0.15)",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.displayName?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your reviewers or start a new study session.
          </p>
        </div>
        <button
          onClick={() => setCombineOpen(true)}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium text-violet-300 hover:bg-violet-600/10 transition-all"
          style={{ borderColor: "rgba(124,58,237,0.3)" }}
        >
          <GitMerge size={15} />
          Combine Reviewers
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-5 border flex items-center gap-4"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: s.bg }}
            >
              <s.icon className={`${s.color} w-5 h-5`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-slate-400 text-sm">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/review"
          className="flex items-center gap-3 p-4 rounded-2xl border border-dashed hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(124,58,237,0.15)" }}
          >
            <Plus className="text-violet-400 w-5 h-5" />
          </div>
          <div>
            <p className="text-white font-medium text-sm group-hover:text-violet-300 transition-colors">
              New Review Session
            </p>
            <p className="text-slate-500 text-xs">Upload & review now</p>
          </div>
        </Link>

        <Link
          href="/dashboard/upload"
          className="flex items-center gap-3 p-4 rounded-2xl border border-dashed hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(59,130,246,0.15)" }}
          >
            <Upload className="text-blue-400 w-5 h-5" />
          </div>
          <div>
            <p className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
              Upload File
            </p>
            <p className="text-slate-500 text-xs">Save to your library</p>
          </div>
        </Link>

        <button
          onClick={() => setCombineOpen(true)}
          className="flex items-center gap-3 p-4 rounded-2xl border border-dashed hover:border-green-500/50 hover:bg-green-500/5 transition-all group sm:hidden"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
          >
            <GitMerge className="text-green-400 w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-white font-medium text-sm group-hover:text-green-300 transition-colors">
              Combine Reviewers
            </p>
            <p className="text-slate-500 text-xs">Merge into one</p>
          </div>
        </button>
      </div>

      {/* Reviewers List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Your Reviewers</h2>
          <Link
            href="/dashboard/reviewers"
            className="text-violet-400 hover:text-violet-300 text-sm transition-colors"
          >
            View all →
          </Link>
        </div>

        {rLoading || fLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-violet-400 w-7 h-7" />
          </div>
        ) : reviewers.length === 0 ? (
          <div
            className="rounded-2xl border p-10 flex flex-col items-center text-center"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <FolderOpen className="text-slate-600 w-12 h-12 mb-3" />
            <p className="text-white font-semibold mb-1">No reviewers yet</p>
            <p className="text-slate-400 text-sm mb-5">
              Upload a file and generate your first reviewer.
            </p>
            <Link
              href="/review"
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95"
            >
              <Plus size={15} />
              Create First Reviewer
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {reviewers.slice(0, 6).map((reviewer) => (
              <div
                key={reviewer.id}
                className="rounded-2xl border p-5 flex flex-col gap-4 hover:border-violet-500/30 transition-all"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-base truncate">
                      {reviewer.title}
                    </h3>
                    {reviewer.description && (
                      <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">
                        {truncate(reviewer.description, 80)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(reviewer)}
                    disabled={deletingId === reviewer.id}
                    className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                  >
                    {deletingId === reviewer.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>

                {/* Tags */}
                {reviewer.tags && reviewer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {reviewer.tags.slice(0, 3).map((tag) => (
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

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <FileText size={11} />
                    {reviewer.fileIds.length} file{reviewer.fileIds.length !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {formatDate(reviewer.updatedAt)}
                  </span>
                </div>

                {/* Actions */}
                <Link
                  href={`/review?reviewerId=${reviewer.id}`}
                  className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2 rounded-xl transition-all active:scale-95"
                >
                  <Play size={14} />
                  Start Reviewing
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Combine Modal */}
      <CombineModal
        open={combineOpen}
        onClose={() => setCombineOpen(false)}
        files={files}
      />
    </div>
  );
}