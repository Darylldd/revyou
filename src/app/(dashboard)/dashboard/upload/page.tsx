"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";
import FileUpload from "@/components/reviewer/FileUpload";
import toast from "react-hot-toast";

export default function UploadPage() {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<
    { fileId: string; text: string; name: string }[]
  >([]);

  function handleSuccess(fileId: string, extractedText: string, fileName: string) {
    setUploadedFiles((prev) => [...prev, { fileId, text: extractedText, name: fileName }]);
    toast.success(`${fileName} saved to your library!`);
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white">Upload Reviewer File</h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload a file to save it to your library. You can later combine multiple files into one reviewer.
        </p>
      </div>

      {/* Upload Area */}
      <FileUpload onSuccess={handleSuccess} saveToAccount={true} />

      {/* Start reviewing button if files uploaded */}
      {uploadedFiles.length > 0 && (
        <div
          className="rounded-2xl border p-5 flex flex-col gap-3"
          style={{ backgroundColor: "var(--surface)", borderColor: "rgba(34,197,94,0.2)" }}
        >
          <p className="text-green-400 font-semibold text-sm">
            ✓ {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} saved to your library!
          </p>
          <p className="text-slate-400 text-sm">
            You can now start a review session or head to your dashboard to combine files.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const text = uploadedFiles.map((f) => f.text).join("\n\n");
                sessionStorage.setItem("reviewText", text);
                sessionStorage.setItem("reviewFileIds", JSON.stringify(uploadedFiles.map((f) => f.fileId)));
                router.push("/review?fromUpload=1");
              }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95"
            >
              <Play size={14} />
              Review Now
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 border text-slate-300 hover:bg-white/5 text-sm font-medium px-5 py-2.5 rounded-xl transition-all"
              style={{ borderColor: "var(--border)" }}
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}