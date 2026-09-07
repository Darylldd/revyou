import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { url, fileType, fileName } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = fileName?.split(".").pop()?.toLowerCase() ?? fileType;

    let extractedText = "";

    if (["txt", "md"].includes(ext)) {
      extractedText = buffer.toString("utf-8");
    } else if (ext === "pdf") {
      extractedText = await extractPdf(buffer);
    } else if (["docx", "doc", "pptx", "xlsx", "xlsm", "odt", "odp", "ods"].includes(ext)) {
      extractedText = await extractOffice(buffer, ext);
    } else if (["heic", "heif"].includes(ext)) {
      extractedText = await extractHeic(buffer);
    } else if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
      extractedText = await extractImage(buffer, ext);
    } else {
      return NextResponse.json({ error: `Unsupported file type: .${ext}` }, { status: 400 });
    }

    const cleaned = extractedText.trim();
    if (!cleaned || cleaned.length < 5) {
      return NextResponse.json({ error: "Could not extract content from this file." }, { status: 400 });
    }

    return NextResponse.json({ extractedText: cleaned });
  } catch (error) {
    console.error("Extraction error:", error);
    const msg = error instanceof Error ? error.message : "Extraction failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── PDF via unpdf ─────────────────────────────────────────────────
async function extractPdf(buffer: Buffer): Promise<string> {
  try {
    const { extractText } = await import("unpdf");
    const uint8 = new Uint8Array(buffer);
    const { text } = await extractText(uint8, { mergePages: true });
    const cleaned = (text ?? "").trim();
    if (!cleaned || cleaned.length < 20) {
      throw new Error("This PDF appears to be scanned/image-based. Upload the pages as JPG/PNG instead, or use a text-based PDF.");
    }
    return cleaned;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("scanned") || msg.includes("image-based")) throw err;
    throw new Error("Failed to read PDF. Make sure it is a valid, non-password-protected, text-based PDF.");
  }
}

// ── Office files: DOCX, DOC, PPTX, XLSX, XLSM via officeparser ──
async function extractOffice(buffer: Buffer, ext: string): Promise<string> {
  // XLSX/XLSM — use SheetJS for richer output
  if (["xlsx", "xlsm"].includes(ext)) {
    return extractExcel(buffer);
  }

  // DOC — try mammoth first (better for .doc), fallback to officeparser
  if (ext === "doc") {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value?.trim() ?? "";
      if (text.length > 20) return text;
    } catch { /* fallthrough */ }
  }

  // DOCX, PPTX, DOC (fallback), ODT, ODP, ODS — officeparser
  try {
    const officeparser = await import("officeparser");
    const parseOffice = (officeparser as any).parseOffice ?? (officeparser as any).parseOfficeAsync;
    const text: string = await new Promise((resolve, reject) => {
      const options = {
        outputErrorToConsole: false,
        newlineDelimiter: "\n",
        ignoreNotes: false,
      };
      const callback = (err: any, data: string) => {
        if (err) return reject(err);
        resolve(data);
      };
      const result = parseOffice(buffer, options, callback);
      if (result && typeof result.then === "function") {
        result.then(resolve).catch(reject);
      } else if (result !== undefined) {
        resolve(result);
      }
    });
    const cleaned = (text ?? "").trim();
    if (!cleaned || cleaned.length < 5) {
      throw new Error(`Could not extract text from this ${ext.toUpperCase()} file. Make sure it contains actual text content.`);
    }
    return cleaned;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Could not extract")) throw err;
    throw new Error(`Failed to read .${ext} file. Make sure it is a valid, uncorrupted file.`);
  }
}

// ── Excel/XLSM via SheetJS ────────────────────────────────────────
async function extractExcel(buffer: Buffer): Promise<string> {
  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const lines: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      const trimmed = csv.trim();
      if (trimmed) {
        lines.push(`=== Sheet: ${sheetName} ===`);
        lines.push(trimmed);
      }
    }

    const result = lines.join("\n\n").trim();
    if (!result || result.length < 5) {
      throw new Error("Spreadsheet appears to be empty or has no readable content.");
    }
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("empty")) throw err;
    throw new Error("Failed to read spreadsheet. Make sure it is a valid .xlsx or .xlsm file.");
  }
}

// ── HEIC/HEIF via sharp → JPEG → Groq Vision ─────────────────────
async function extractHeic(buffer: Buffer): Promise<string> {
  try {
    const sharp = await import("sharp");
    // Convert HEIC/HEIF to JPEG
    const jpegBuffer = await sharp.default(buffer).jpeg({ quality: 90 }).toBuffer();
    return extractImage(jpegBuffer, "jpg");
  } catch (err) {
    // If sharp fails (HEIC support varies), send raw to Groq Vision as fallback
    console.error("Sharp HEIC conversion failed, trying direct:", err);
    return extractImage(buffer, "jpg");
  }
}

// ── Images via Groq Vision ────────────────────────────────────────
async function extractImage(buffer: Buffer, ext: string): Promise<string> {
  const mimeMap: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    webp: "image/webp", gif: "image/gif",
  };
  const mimeType = mimeMap[ext] ?? "image/jpeg";
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await groq.chat.completions.create({
    model: "qwen/qwen3.6-27b",
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: dataUrl } },
          {
            type: "text",
            text: `You are a study material analyzer for a flashcard/quiz application.

Extract ALL useful educational content from this image.

STEP 1 — identify the image type:
- Text document (notes, textbook page, slides, test questions) → extract all text verbatim
- Diagram/chart/figure (flowchart, graph, labeled diagram, table) → describe all labels and data
- Photo/illustration with educational value (anatomy, science, geography) → describe in detail
- Handwritten notes → transcribe as accurately as possible

STEP 2 — extract based on type:

For TEXT:
- Copy every word exactly
- Preserve numbered lists, bullets, headings
- For MCQ: keep format "1. Question\nA. Choice\nB. Choice\nC. Choice\nD. Choice"
- For tables: row by row with | separators

For DIAGRAMS/CHARTS:
- State diagram type and title
- List all labeled parts and what they mean
- Describe flows, hierarchies, relationships
- Include all numbers, percentages, units

For PHOTOS/ILLUSTRATIONS:
- Identify subject clearly
- Describe all labeled parts
- Explain the educational concept shown
- Include any annotations

RULES:
- Be thorough — more detail = better flashcards
- Never output "NO_TEXT_FOUND" unless image is completely blank or unrelated to any subject
- If image has no text but has educational content, describe it in detail
- No preamble like "Here is the content:" — just output directly`,
          },
        ],
      },
    ],
    temperature: 0.05,
    max_completion_tokens: 900,
  });

  const text = response.choices[0]?.message?.content ?? "";
  if (!text || text.trim().length < 10) {
    throw new Error("Image appears blank or contains no educational content.");
  }
  return text.trim();
}
