import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
    } else if (["doc", "docx"].includes(ext)) {
      extractedText = await extractDocx(buffer);
    } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
      extractedText = await extractImage(buffer, ext);
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: ${ext}. Use PDF, DOCX, TXT, PNG, or JPG.` },
        { status: 400 }
      );
    }

    const cleaned = extractedText.trim();
    if (!cleaned || cleaned.length < 5) {
      return NextResponse.json(
        { error: "Could not extract content from this file." },
        { status: 400 }
      );
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

    // unpdf needs a Uint8Array
    const uint8 = new Uint8Array(buffer);
    const { text } = await extractText(uint8, { mergePages: true });

    const cleaned = (text ?? "").trim();

    if (!cleaned || cleaned.length < 20) {
      throw new Error(
        "SCANNED_PDF: This PDF appears to be scanned or image-based. " +
        "Please upload the pages as JPG/PNG instead, or use a text-based PDF."
      );
    }

    return cleaned;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("SCANNED_PDF:")) {
      throw new Error(msg.replace("SCANNED_PDF: ", ""));
    }
    console.error("PDF extraction internal error:", err);
    throw new Error(
      "Failed to read PDF. Make sure it is a valid, non-password-protected, text-based PDF."
    );
  }
}

// ── DOCX via mammoth ──────────────────────────────────────────────
async function extractDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    // mammoth accepts { buffer } directly
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim() ?? "";
    if (!text || text.length < 10) {
      throw new Error("Word document appears to be empty or has no extractable text.");
    }
    return text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("empty")) throw err;
    throw new Error("Failed to read Word document. Make sure it is a valid .docx file.");
  }
}

// ── Image via Groq Vision ─────────────────────────────────────────
// Works for BOTH text-heavy images AND diagrams/photos with no text
async function extractImage(buffer: Buffer, ext: string): Promise<string> {
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };

  const mimeType = mimeMap[ext] ?? "image/jpeg";
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: dataUrl } },
          {
            type: "text",
            text: `You are a study material analyzer for a reviewer/flashcard application.

Your job is to extract ALL useful study content from this image — whether it has text or not.

STEP 1 — DETECT what type of image this is:
- Text-heavy (notes, textbook page, test questions, slides) → extract all text verbatim
- Diagram/chart/figure (labeled diagram, flowchart, graph, map) → describe all labels, relationships, and data
- Photo/illustration with educational value (anatomy, geography, science concept) → describe what is shown and its educational significance in detail
- Mixed (diagram with captions) → do both

STEP 2 — EXTRACT or DESCRIBE based on type:

For TEXT content:
- Extract every word exactly as written
- Preserve structure: headings, bullet points, numbered lists
- For MCQ questions: preserve format with choices labeled A/B/C/D
- For tables: extract as rows with clear separators

For DIAGRAMS/CHARTS:
- Name the diagram/chart type and its title if visible
- List all labeled parts and what they represent
- Describe relationships, flows, or hierarchies
- Include any numerical values, percentages, or measurements
- For timelines: list all events in order
- For graphs: describe axes, trends, and key data points

For PHOTOS/ILLUSTRATIONS:
- Identify the subject (what/who is shown)
- Describe key features relevant to studying (e.g. parts of the cell, bones in the body)
- Include any visible labels or annotations
- Explain the educational context or concept illustrated

IMPORTANT:
- NEVER say the image has no text if it has visual educational content — describe it instead
- NEVER output "NO_TEXT_FOUND" unless the image is completely blank/unrelated to any subject
- Your output will be used to generate study flashcards and quiz questions
- Be thorough — the more detail you extract, the better the flashcards will be
- Do not add preamble like "Here is the extracted content:" — just output the content directly`,
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 4000,
  });

  const text = response.choices[0]?.message?.content ?? "";

  if (!text || text.trim().length < 10 || text.trim() === "NO_TEXT_FOUND") {
    throw new Error(
      "This image appears to be blank or unrelated to any study material. Please upload an image with educational content."
    );
  }

  return text.trim();
}