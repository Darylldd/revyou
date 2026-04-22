"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";
import FileUpload from "@/components/reviewer/FileUpload";
import toast from "react-hot-toast";

export default function UploadPage() {
  const router = useRouter();
  const [uploaded, setUploaded] = useState<{ fileId: string; text: string; name: string }[]>([]);

  function handleSuccess(fileId: string, extractedText: string, fileName: string) {
    setUploaded((prev) => [...prev, { fileId, text: extractedText, name: fileName }]);
    toast.success(`${fileName} saved!`);
  }

  return (
   <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <Link href="/dashboard" style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 13, color: "var(--ink-3)", textDecoration: "none", marginBottom: 20,
      }}>
        <ArrowLeft size={13} /> back
      </Link>

      <h1 className="hand" style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
        upload a file
      </h1>
      <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 20 }}>
        saved to your library — combine multiple files into one reviewer later
      </p>

      <FileUpload onSuccess={handleSuccess} saveToAccount={true} />

      {uploaded.length > 0 && (
        <div className="ruled" style={{
          border: "1px solid var(--border-2)",
          borderLeft: "3px solid var(--green)",
          borderRadius: 3, padding: "16px 20px", marginTop: 16,
        }}>
          <p className="hand" style={{ fontSize: 16, fontWeight: 700, color: "var(--green)", marginBottom: 6 }}>
            ✓ {uploaded.length} file{uploaded.length > 1 ? "s" : ""} saved to your library
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => {
              sessionStorage.setItem("reviewText", uploaded.map((f) => f.text).join("\n\n"));
              sessionStorage.setItem("reviewFileIds", JSON.stringify(uploaded.map((f) => f.fileId)));
              router.push("/review?fromUpload=1");
            }} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "var(--blue)", color: "#fff",
              padding: "7px 14px", borderRadius: 4,
              fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
            }}>
              <Play size={13} /> review now
            </button>
            <Link href="/dashboard" style={{
              display: "inline-flex", alignItems: "center",
              padding: "6px 14px", borderRadius: 4,
              fontSize: 13, color: "var(--ink-2)", textDecoration: "none",
              border: "1.5px solid var(--border)",
            }}>
              go to my desk
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}