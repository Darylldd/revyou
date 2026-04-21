"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
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

  // ✅ FIX: derive uploading state
  const uploading = uploadedFiles.some(
    (f) => f.status === "uploading" || f.status === "extracting"
  );

  const uploadProgress = uploading ? "Processing files..." : "";

  const updateFile = (index: number, updates: Partial<UploadedFile>) => {
    setUploadedFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  const processFile = async (file: File, index: number) => {
    try {
      updateFile(index, { status: "uploading", progress: 10 });

      // 1. Upload
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
      updateFile(index, {
        status: "extracting",
        progress: 50,
        cloudinaryUrl: url,
      });

      // 2. Extract
      const ext = getFileExtension(file.name);

      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          fileType: ext,
          fileName: file.name,
        }),
      });

      if (!extractRes.ok) {
        const err = await extractRes.json();
        throw new Error(err.error ?? "Text extraction failed");
      }

      const { extractedText } = await extractRes.json();

      if (!extractedText || extractedText.trim().length < 5) {
        throw new Error("No text could be extracted from this file.");
      }

      updateFile(index, {
        status: "done",
        progress: 100,
        extractedText,
      });

      let fileId = `guest_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;

      // 3. Save to Firestore (optional)
      if (user && saveToAccount) {
        try {
          const { collection, addDoc, serverTimestamp } = await import(
            "firebase/firestore"
          );
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
        } catch (err) {
          console.error(err);
          toast.error("Saved failed (Firestore rules?)");
        }
      }

      onSuccess?.(fileId, extractedText.trim(), file.name);
      toast.success(`${file.name} processed!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      updateFile(index, { status: "error", error: message });
      toast.error(`Failed: ${file.name}`);
    }
  };

  const handleFiles = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((f) =>
        isSupportedFile(f.name)
      );

      if (validFiles.length === 0) return;

      setUploadedFiles((prev) => {
        const startIndex = prev.length;

        const newFiles: UploadedFile[] = validFiles.map((file) => ({
          file,
          status: "pending",
          progress: 0,
        }));

        // process after state updates
        setTimeout(() => {
          validFiles.forEach((file, i) => {
            processFile(file, startIndex + i);
          });
        }, 0);

        return [...prev, ...newFiles];
      });
    },
    [user, saveToAccount]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    multiple: true,
    maxSize: 10 * 1024 * 1024,
    disabled: uploading, // ✅ prevents interaction while uploading
  });

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const statusIcon = (file: UploadedFile) => {
    switch (file.status) {
      case "uploading":
      case "extracting":
        return <Loader2 size={16} className="animate-spin" />;
      case "done":
        return <CheckCircle size={16} />;
      case "error":
        return <AlertCircle size={16} />;
      default:
        return <File size={16} />;
    }
  };

  const statusLabel = (file: UploadedFile) => {
    switch (file.status) {
      case "uploading":
        return "Uploading...";
      case "extracting":
        return "Extracting...";
      case "done":
        return "Ready";
      case "error":
        return file.error ?? "Error";
      default:
        return "Pending";
    }
  };

return (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {/* Dropzone */}
    <div
      {...getRootProps()}
      className="upload-dropzone"
      style={{
        border: `2px dashed ${isDragActive ? "var(--blue)" : "var(--border)"}`,
        borderRadius: 4,
        padding: "32px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        cursor: uploading ? "not-allowed" : "pointer",
        background: isDragActive ? "var(--blue-dim)" : "var(--card)",
        transition: "all .15s",
        minHeight: 180,
      }}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <Loader2 size={28} style={{ color: "var(--blue)" }} className="animate-spin" />
          <p className="hand" style={{ fontSize: 15, color: "var(--blue)" }}>{uploadProgress}</p>
        </div>
      ) : (
        <>
          <div style={{
            width: 44, height: 44, borderRadius: 8, margin: "0 auto 12px",
            background: "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Upload size={20} style={{ color: "var(--blue)" }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-2)", marginBottom: 4 }}>
            {isDragActive ? "drop it here!" : "drag & drop or click to browse"}
          </p>
          <p style={{ fontSize: 11, color: "var(--ink-4)" }}>
            PDF · PPTX · DOCX · XLSX · PNG · JPG · HEIC · TXT · max 10MB
          </p>
        </>
      )}
    </div>

    {/* File list — themed version */}
    {uploadedFiles.length > 0 && (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {uploadedFiles.map((f, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px",
            background: f.status === "done" ? "var(--green-light)" : f.status === "error" ? "var(--red-light)" : "var(--card)",
            border: `1px solid ${f.status === "done" ? "rgba(0,0,0,0.08)" : f.status === "error" ? "rgba(0,0,0,0.08)" : "var(--border)"}`,
            borderRadius: 4,
          }}>
            {statusIcon(f)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.file.name}
              </p>
              <p style={{
                fontSize: 11, margin: 0,
                color: f.status === "done" ? "var(--green)" : f.status === "error" ? "var(--red)" : "var(--ink-4)",
              }}>
                {statusLabel(f)}
              </p>
            </div>
            {(f.status === "done" || f.status === "error") && (
              <button onClick={() => removeFile(i)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--ink-4)", padding: 0, flexShrink: 0,
              }}>
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);
}