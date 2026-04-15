"use client";

import { useState } from "react";
import { X, GitMerge, CheckSquare, Square, Loader2 } from "lucide-react";
import { useReviewers } from "@/hooks/useReviewers";
import type { ReviewerFile } from "@/types";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface CombineModalProps {
  open: boolean;
  onClose: () => void;
  files: ReviewerFile[];
}

export default function CombineModal({ open, onClose, files }: CombineModalProps) {
  const router = useRouter();
  const { createReviewer } = useReviewers();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function toggleFile(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCombine() {
    if (!title.trim()) {
      toast.error("Please enter a title.");
      return;
    }
    if (selectedIds.size < 1) {
      toast.error("Select at least one file.");
      return;
    }

    setLoading(true);
    try {
      const selectedFiles = files.filter((f) => selectedIds.has(f.id));
      const combinedText = selectedFiles
        .map((f) => `=== ${f.fileName} ===\n${f.extractedText}`)
        .join("\n\n");

      const reviewerId = await createReviewer(
        title.trim(),
        Array.from(selectedIds),
        combinedText,
        description.trim()
      );

      toast.success("Reviewer created!");
      onClose();
      router.push(`/review?reviewerId=${reviewerId}`);
    } catch {
      toast.error("Failed to create reviewer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-2xl border flex flex-col max-h-[85vh]"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <GitMerge className="text-violet-400 w-5 h-5" />
            <h2 className="text-white font-bold text-lg">Combine Reviewers</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Combined Reviewer"
              className="w-full border rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What topics does this cover?"
              rows={2}
              className="w-full border rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">
              Select Files ({selectedIds.size} selected)
            </p>
            {files.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">
                No files uploaded yet. Upload some files first.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => toggleFile(file.id)}
                    className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:border-violet-500/40"
                    style={{
                      backgroundColor: selectedIds.has(file.id)
                        ? "rgba(124,58,237,0.1)"
                        : "rgba(255,255,255,0.03)",
                      borderColor: selectedIds.has(file.id)
                        ? "rgba(124,58,237,0.4)"
                        : "var(--border)",
                    }}
                  >
                    {selectedIds.has(file.id) ? (
                      <CheckSquare size={16} className="text-violet-400 flex-shrink-0" />
                    ) : (
                      <Square size={16} className="text-slate-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{file.fileName}</p>
                      <p className="text-slate-500 text-xs">
                        {file.extractedText.length} characters extracted
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-5 border-t flex gap-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-slate-300 hover:bg-white/5 text-sm font-medium transition-all"
            style={{ borderColor: "var(--border)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleCombine}
            disabled={loading || selectedIds.size === 0 || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <GitMerge size={15} />}
            {loading ? "Creating..." : "Combine & Review"}
          </button>
        </div>
      </div>
    </div>
  );
}