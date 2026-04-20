"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { isSupportedFile, getFileExtension } from "@/lib/utils";
import toast from "react-hot-toast";

interface UploadedFile {
  file: File;
  status: "pending" | "uploading" | "extracting" | "done" | "error";
  progress: number;
  error?: string;
  cloudinaryUrl?: string;
  extractedText?: string;
}

interface FileUploadProps {
  onSuccess?: (fileId: string, extractedText: string, fileName: string) => void;
  saveToAccount?: boolean;
}

export default function FileUpload({
  onSuccess,
  saveToAccount = true,
}: FileUploadProps) {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const updateFile = (index: number, updates: Partial<UploadedFile>) => {
    setUploadedFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

 const processFile = async (file: File, index: number) => {
  updateFile(index, { status: "uploading", progress: 10 });

  // 1. Upload to Cloudinary
  const formData = new FormData();
  formData.append("file", file);

  const uploadRes = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(err.error ?? "Upload failed");
  }

  const { url, publicId } = await uploadRes.json();
  updateFile(index, { status: "extracting", progress: 50, cloudinaryUrl: url });

  // 2. Extract text
  const ext = getFileExtension(file.name);
  const extractRes = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, fileType: ext, fileName: file.name }),
  });

  if (!extractRes.ok) {
    const err = await extractRes.json();
    throw new Error(err.error ?? "Text extraction failed");
  }

  const { extractedText } = await extractRes.json();

  if (!extractedText || extractedText.trim().length < 5) {
    throw new Error("No text could be extracted from this file.");
  }

  updateFile(index, { status: "done", progress: 100, extractedText });

  // 3. Save to Firestore only if user is logged in AND saveToAccount is true
  let fileId = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  if (user && saveToAccount) {
    try {
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      const docRef = await addDoc(collection(db, "reviewerFiles"), {
        userId: user.uid,
        fileName: file.name,
        fileType: ext,
        cloudinaryUrl: url,
        cloudinaryPublicId: publicId ?? "",
        extractedText: extractedText.trim(),
        status: "ready",
        createdAt: serverTimestamp(),
      });

      fileId = docRef.id;
      console.log("Saved to library:", fileId);
    } catch (firestoreErr) {
      // Don't fail the whole upload if Firestore save fails
      console.error("Firestore save failed:", firestoreErr);
      toast.error("File processed but couldn't save to library. Check Firestore rules.");
    }
  }

  onSuccess?.(fileId, extractedText.trim(), file.name);
  return fileId;
};

  const handleFiles = useCallback(
    async (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((f) => isSupportedFile(f.name));
      const invalidFiles = acceptedFiles.filter((f) => !isSupportedFile(f.name));

      if (invalidFiles.length > 0) {
        toast.error(`Unsupported file type(s): ${invalidFiles.map((f) => f.name).join(", ")}`);
      }

      if (validFiles.length === 0) return;

      const newFiles: UploadedFile[] = validFiles.map((file) => ({
        file,
        status: "pending",
        progress: 0,
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);
      const startIndex = uploadedFiles.length;

      for (let i = 0; i < validFiles.length; i++) {
        try {
          await processFile(validFiles[i], startIndex + i);
          toast.success(`${validFiles[i].name} processed!`);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          updateFile(startIndex + i, { status: "error", error: message });
          toast.error(`Failed to process ${validFiles[i].name}`);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uploadedFiles.length, user, saveToAccount, onSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    multiple: true,
    maxSize: 10 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const statusIcon = (file: UploadedFile) => {
    switch (file.status) {
      case "uploading":
      case "extracting":
        return <Loader2 size={16} className="animate-spin text-violet-400" />;
      case "done":
        return <CheckCircle size={16} className="text-green-400" />;
      case "error":
        return <AlertCircle size={16} className="text-red-400" />;
      default:
        return <File size={16} className="text-slate-400" />;
    }
  };

  const statusLabel = (file: UploadedFile) => {
    switch (file.status) {
      case "uploading": return "Uploading...";
      case "extracting": return "Extracting text...";
      case "done": return "Ready";
      case "error": return file.error ?? "Error";
      default: return "Pending";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
          ${isDragActive
            ? "border-violet-500 bg-violet-500/10"
            : "border-white/10 hover:border-violet-500/50 hover:bg-white/5"
          }`}
      >
        <input {...getInputProps()} />
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(124,58,237,0.15)" }}
        >
          <Upload className="text-violet-400 w-7 h-7" />
        </div>
        {isDragActive ? (
          <p className="text-violet-300 font-semibold text-lg">Drop files here...</p>
        ) : (
          <>
            <p className="text-white font-semibold text-lg mb-1">
              Drag & drop your reviewer files
            </p>
            <p className="text-slate-400 text-sm mb-3">
              or click to browse files
            </p>
          </>
        )}
        <p className="text-slate-500 text-xs">
          Supports PDF, PNG, JPG, WEBP, TXT, DOCX • Max 10MB
        </p>
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-col gap-2">
          {uploadedFiles.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: "var(--surface)",
                borderColor:
                  f.status === "error"
                    ? "rgba(239,68,68,0.3)"
                    : f.status === "done"
                    ? "rgba(34,197,94,0.2)"
                    : "var(--border)",
              }}
            >
              {statusIcon(f)}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{f.file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p
                    className={`text-xs ${
                      f.status === "error"
                        ? "text-red-400"
                        : f.status === "done"
                        ? "text-green-400"
                        : "text-slate-500"
                    }`}
                  >
                    {statusLabel(f)}
                  </p>
                  {(f.status === "uploading" || f.status === "extracting") && (
                    <div
                      className="flex-1 h-1 rounded-full overflow-hidden"
                      style={{ backgroundColor: "var(--border)" }}
                    >
                      <div
                        className="h-full bg-violet-500 transition-all duration-500 rounded-full"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              {(f.status === "done" || f.status === "error") && (
                <button
                  onClick={() => removeFile(i)}
                  className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}