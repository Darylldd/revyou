"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  Brain,
  Zap,
  Layers,
  ChevronRight,
  FileText,
  Loader2,
  Sparkles,
  BarChart2,
  Hash,
  Library,
  CheckCircle,
} from "lucide-react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  DifficultyLevel,
  ReviewMode,
  Flashcard,
  MultipleChoiceQuestion,
  ReviewerFile,
} from "@/types";
import type { User } from "@/types";
import { isSupportedFile, getFileExtension, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface SessionConfigProps {
  preloadedText?: string;
  preloadedTitle?: string;
  onStart: (
    text: string,
    mode: ReviewMode,
    difficulty: DifficultyLevel,
    flashcards?: Flashcard[],
    questions?: MultipleChoiceQuestion[]
  ) => void;
  user: User | null;
}

const modes: {
  id: ReviewMode;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  {
    id: "flashcard",
    label: "Flashcards",
    desc: "Flip cards to test your memory",
    icon: Brain,
    color: "text-violet-400",
    bg: "rgba(124,58,237,0.15)",
  },
  {
    id: "multiple-choice",
    label: "Quiz",
    desc: "Answer multiple choice questions",
    icon: Zap,
    color: "text-blue-400",
    bg: "rgba(59,130,246,0.15)",
  },
  {
    id: "combined",
    label: "Combined",
    desc: "Flashcards then a quiz",
    icon: Layers,
    color: "text-green-400",
    bg: "rgba(34,197,94,0.15)",
  },
];

const difficulties: {
  id: DifficultyLevel;
  label: string;
  desc: string;
  color: string;
  border: string;
  selectedBg: string;
}[] = [
  {
    id: "easy",
    label: "Easy",
    desc: "Basic recall & definitions",
    color: "text-green-400",
    border: "rgba(34,197,94,0.4)",
    selectedBg: "rgba(34,197,94,0.1)",
  },
  {
    id: "medium",
    label: "Medium",
    desc: "Concepts & application",
    color: "text-yellow-400",
    border: "rgba(234,179,8,0.4)",
    selectedBg: "rgba(234,179,8,0.1)",
  },
  {
    id: "hard",
    label: "Hard",
    desc: "Deep analysis & synthesis",
    color: "text-red-400",
    border: "rgba(239,68,68,0.4)",
    selectedBg: "rgba(239,68,68,0.1)",
  },
];

export default function SessionConfig({
  preloadedText,
  preloadedTitle,
  onStart,
  user,
}: SessionConfigProps) {
  const [extractedText, setExtractedText] = useState(preloadedText ?? "");
  const [fileName, setFileName] = useState(preloadedTitle ?? "");
  const [mode, setMode] = useState<ReviewMode>("flashcard");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [itemCount, setItemCount] = useState(10);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  // Library tab
  const [uploadTab, setUploadTab] = useState<"upload" | "library">("upload");
  const [savedFiles, setSavedFiles] = useState<ReviewerFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const hasText = extractedText.trim().length > 50;

  // Load saved files when switching to library tab
  useEffect(() => {
    if (uploadTab !== "library" || !user || savedFiles.length > 0) return;
    setLoadingFiles(true);
    getDocs(
      query(
        collection(db, "reviewerFiles"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      )
    )
      .then((snap) => {
        const files = snap.docs.map((d) => {
          const raw = d.data();
          return {
            ...raw,
            id: d.id,
            createdAt:
              raw.createdAt instanceof Timestamp
                ? raw.createdAt.toDate()
                : new Date(),
          } as ReviewerFile;
        });
        setSavedFiles(files);
      })
      .catch(console.error)
      .finally(() => setLoadingFiles(false));
  }, [uploadTab, user, savedFiles.length]);

  function selectSavedFile(file: ReviewerFile) {
    setSelectedFileId(file.id);
    setExtractedText(file.extractedText);
    setFileName(file.fileName);
    toast.success(`"${file.fileName}" loaded!`);
  }

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      if (!isSupportedFile(file.name)) {
        toast.error(`Unsupported file type.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large. Max 10MB.");
        return;
      }

      setUploading(true);
      setUploadProgress("Uploading to cloud...");

      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const { url } = await uploadRes.json();

        setUploadProgress("Extracting text...");

        const ext = getFileExtension(file.name);
        const extractRes = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, fileType: ext, fileName: file.name }),
        });
        if (!extractRes.ok) {
          const err = await extractRes.json();
          throw new Error(err.error ?? "Extraction failed");
        }
        const { extractedText: text, needsClientExtraction } =
          await extractRes.json();

        if (needsClientExtraction) {
          const mammoth = await import("mammoth");
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          setExtractedText(result.value);
        } else {
          setExtractedText(text);
        }

        setFileName(file.name);
        setSelectedFileId(null);
        toast.success("File processed!");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to process file.";
        toast.error(msg);
      } finally {
        setUploading(false);
        setUploadProgress("");
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    multiple: false,
    disabled: uploading || generating,
  });

  async function handleGenerate() {
    if (!hasText) {
      toast.error("Please upload a file or select one from your library first.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedText, mode, difficulty, itemCount }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Generation failed");
      }

      const data = await res.json();

      // Validate the response
      if (mode === "multiple-choice" && (!data.questions || data.questions.length === 0)) {
        throw new Error("No questions were generated. Please try again.");
      }
      if (mode === "flashcard" && (!data.flashcards || data.flashcards.length === 0)) {
        throw new Error("No flashcards were generated. Please try again.");
      }

      onStart(extractedText, mode, difficulty, data.flashcards, data.questions);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      {/* Header */}
      <div className="text-center">
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 border"
          style={{
            backgroundColor: "rgba(124,58,237,0.1)",
            borderColor: "rgba(124,58,237,0.2)",
          }}
        >
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-violet-300 text-sm font-medium">
            AI-Powered Review Session
          </span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Set Up Your Review</h1>
        <p className="text-slate-400 text-sm">
          Upload your material and configure how you want to study.
          {!user && (
            <span className="text-violet-400"> Sign in to save progress.</span>
          )}
        </p>
      </div>

      {/* Step 1 — Upload / Library */}
      <div
        className="rounded-2xl border p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: "var(--accent)" }}
            >
              1
            </div>
            <h2 className="text-white font-semibold">Upload Reviewer File</h2>
          </div>

          {/* Tab switcher — only show if user is logged in and has files */}
          {user && (
            <div
              className="flex rounded-lg overflow-hidden border text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                onClick={() => setUploadTab("upload")}
                className={`px-3 py-1.5 font-medium transition-colors flex items-center gap-1.5 ${
                  uploadTab === "upload"
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Upload size={12} />
                Upload New
              </button>
              <button
                onClick={() => setUploadTab("library")}
                className={`px-3 py-1.5 font-medium transition-colors flex items-center gap-1.5 ${
                  uploadTab === "library"
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Library size={12} />
                My Library
              </button>
            </div>
          )}
        </div>

        {/* Active file indicator */}
        {hasText && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl border"
            style={{
              backgroundColor: "rgba(34,197,94,0.05)",
              borderColor: "rgba(34,197,94,0.2)",
            }}
          >
            <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {fileName || "File loaded"}
              </p>
              <p className="text-green-400 text-xs">
                ✓ {extractedText.length.toLocaleString()} characters ready
              </p>
            </div>
            <button
              onClick={() => {
                setExtractedText("");
                setFileName("");
                setSelectedFileId(null);
              }}
              className="text-slate-500 hover:text-red-400 transition-colors text-xs"
            >
              Clear
            </button>
          </div>
        )}

        {/* Upload Tab */}
        {uploadTab === "upload" && !hasText && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
              ${
                isDragActive
                  ? "border-violet-500 bg-violet-500/10"
                  : uploading
                  ? "border-violet-500/50 bg-violet-500/5 cursor-not-allowed"
                  : "border-white/10 hover:border-violet-500/50 hover:bg-white/5"
              }`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="text-violet-400 w-8 h-8 animate-spin" />
                <p className="text-violet-300 font-medium">{uploadProgress}</p>
                <p className="text-slate-500 text-xs">This may take a moment...</p>
              </div>
            ) : (
              <>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: "rgba(124,58,237,0.15)" }}
                >
                  <Upload className="text-violet-400 w-6 h-6" />
                </div>
                <p className="text-white font-semibold mb-1">
                  {isDragActive ? "Drop it here!" : "Drag & drop your file"}
                </p>
                <p className="text-slate-400 text-sm mb-2">or click to browse</p>
                <p className="text-slate-500 text-xs">
                  PDF, PPTX, DOCX, XLSX, PNG, JPG, HEIC, TXT • Max 10MB
                </p>
              </>
            )}
          </div>
        )}

        {/* Library Tab */}
        {uploadTab === "library" && !hasText && (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {loadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-violet-400 w-6 h-6" />
              </div>
            ) : savedFiles.length === 0 ? (
              <div className="text-center py-8">
                <Library className="text-slate-600 w-10 h-10 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No saved files yet.</p>
                <button
                  onClick={() => setUploadTab("upload")}
                  className="text-violet-400 text-xs mt-1 hover:underline"
                >
                  Upload a file first →
                </button>
              </div>
            ) : (
              savedFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => selectSavedFile(file)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:border-violet-500/40 ${
                    selectedFileId === file.id ? "border-violet-500/60" : ""
                  }`}
                  style={{
                    backgroundColor:
                      selectedFileId === file.id
                        ? "rgba(124,58,237,0.1)"
                        : "rgba(255,255,255,0.03)",
                    borderColor:
                      selectedFileId === file.id
                        ? "rgba(124,58,237,0.4)"
                        : "var(--border)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "rgba(124,58,237,0.15)" }}
                  >
                    <FileText size={16} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {file.fileName}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {file.extractedText.length.toLocaleString()} chars •{" "}
                      {formatDate(file.createdAt)}
                    </p>
                  </div>
                  {selectedFileId === file.id && (
                    <CheckCircle size={16} className="text-violet-400 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Step 2 — Mode */}
      <div
        className="rounded-2xl border p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: "var(--accent)" }}
          >
            2
          </div>
          <h2 className="text-white font-semibold">Choose Review Mode</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className="flex flex-col items-start gap-2 p-4 rounded-xl border transition-all duration-200 text-left"
              style={{
                backgroundColor: mode === m.id ? m.bg : "rgba(255,255,255,0.03)",
                borderColor: mode === m.id ? "currentColor" : "var(--border)",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: m.bg }}
              >
                <m.icon className={`${m.color} w-5 h-5`} />
              </div>
              <div>
                <p
                  className={`font-semibold text-sm ${
                    mode === m.id ? "text-white" : "text-slate-300"
                  }`}
                >
                  {m.label}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3 — Difficulty */}
      <div
        className="rounded-2xl border p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: "var(--accent)" }}
          >
            3
          </div>
          <h2 className="text-white font-semibold flex items-center gap-2">
            <BarChart2 size={16} className="text-slate-400" />
            Difficulty Level
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {difficulties.map((d) => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className="flex flex-col gap-1 p-3 rounded-xl border transition-all duration-200 text-left"
              style={{
                backgroundColor:
                  difficulty === d.id ? d.selectedBg : "rgba(255,255,255,0.03)",
                borderColor: difficulty === d.id ? d.border : "var(--border)",
              }}
            >
              <p
                className={`font-semibold text-sm ${
                  difficulty === d.id ? d.color : "text-slate-400"
                }`}
              >
                {d.label}
              </p>
              <p className="text-slate-500 text-xs leading-snug">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Step 4 — Item Count */}
      <div
        className="rounded-2xl border p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: "var(--accent)" }}
          >
            4
          </div>
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Hash size={16} className="text-slate-400" />
            Number of Items
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={5}
            max={30}
            step={5}
            value={itemCount}
            onChange={(e) => setItemCount(Number(e.target.value))}
            className="flex-1 accent-violet-500"
          />
          <div
            className="w-16 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg"
            style={{ backgroundColor: "rgba(124,58,237,0.2)" }}
          >
            {itemCount}
          </div>
        </div>
        <p className="text-slate-500 text-xs">
          {mode === "combined"
            ? `${Math.ceil(itemCount / 2)} flashcards + ${Math.floor(itemCount / 2)} quiz questions`
            : `${itemCount} ${mode === "flashcard" ? "flashcards" : "questions"} will be generated`}
        </p>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!hasText || generating || uploading}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-white text-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background:
            hasText && !generating
              ? "linear-gradient(135deg, #7c3aed, #a855f7)"
              : "rgba(124,58,237,0.3)",
          boxShadow:
            hasText && !generating ? "0 4px 24px rgba(124,58,237,0.4)" : "none",
        }}
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating your reviewer...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate & Start Reviewing
            <ChevronRight className="w-5 h-5" />
          </>
        )}
      </button>

      {generating && (
        <p className="text-center text-slate-500 text-sm -mt-4">
          AI is analyzing your material. This takes 5–15 seconds...
        </p>
      )}
    </div>
  );
}