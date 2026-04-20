import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { url, fileType, fileName } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const ext = fileName?.split(".").pop()?.toLowerCase() ?? fileType;

    let extractedText = "";

    // ── Plain text ────────────────────────────────────────────────
    if (["txt", "md"].includes(ext)) {
      extractedText = Buffer.from(arrayBuffer).toString("utf-8");
    }

    // ── PDF — pdfjs-dist, runs locally, free ─────────────────────
    else if (ext === "pdf") {
      extractedText = await extractPdfText(arrayBuffer);
    }

    // ── DOCX — mammoth, runs locally, free ───────────────────────
    else if (["doc", "docx"].includes(ext)) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value;
    }

    // ── Images — Groq Vision (smarter than OCR) ──────────────────
    else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
      extractedText = await extractImageWithGroqVision(arrayBuffer, ext);
    }

    else {
      return NextResponse.json(
        { error: `Unsupported file type: ${ext}. Use PDF, DOCX, TXT, PNG, or JPG.` },
        { status: 400 }
      );
    }

    const cleaned = extractedText.trim();

    if (!cleaned || cleaned.length < 10) {
      return NextResponse.json(
        { error: "Could not extract readable text. Make sure your file has actual text content." },
        { status: 400 }
      );
    }

    return NextResponse.json({ extractedText: cleaned });

  } catch (error) {
    console.error("Extraction error:", error);

    if (error instanceof Error) {
      if (error.message.includes("429") || error.message.includes("rate_limit")) {
        return NextResponse.json(
          { error: "Rate limit hit. Please wait 30 seconds and try again." },
          { status: 429 }
        );
      }
      // Return the actual error message for easier debugging
      return NextResponse.json(
        { error: `Extraction failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Text extraction failed. Please try a different file." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// PDF via pdfjs-dist — 100% local, no API calls
// ─────────────────────────────────────────────────────────────────
async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) pages.push(text);
  }

  if (pages.length === 0) {
    throw new Error(
      "This PDF appears to be scanned or image-based. Please upload a text-based PDF or use a JPG/PNG file instead."
    );
  }

  return pages.join("\n\n");
}

// ─────────────────────────────────────────────────────────────────
// Image extraction via Groq Vision — free, smarter than OCR
// Uses llama-3.2-11b-vision which understands context, not just text
// ─────────────────────────────────────────────────────────────────
async function extractImageWithGroqVision(
  arrayBuffer: ArrayBuffer,
  ext: string
): Promise<string> {
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };

  const mimeType = mimeMap[ext] ?? "image/jpeg";
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await groq.chat.completions.create({
model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
          {
            type: "text",
            text: `You are a text extraction assistant. Extract ALL text content from this image.
This is a study material / reviewer document.

Instructions:
- Extract every piece of text visible in the image
- Preserve the structure: headings, bullet points, numbered lists, paragraphs
- Keep all facts, definitions, formulas, and key terms exactly as written
- If there are tables, preserve the data in a readable format
- Do NOT summarize — extract the full raw text
- Do NOT add commentary or explanation — just the extracted content`,
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 4000,
  });

  const text = response.choices[0]?.message?.content ?? "";
  if (!text || text.trim().length < 5) {
    throw new Error("Could not extract text from image. Make sure the image contains readable text.");
  }
  return text;
}