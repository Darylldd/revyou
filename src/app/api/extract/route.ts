import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { url, fileType, fileName } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Fetch the file as base64
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const ext = fileName?.split(".").pop()?.toLowerCase() ?? fileType;

    let extractedText = "";

    // Handle images — use Claude Vision
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
      const mimeMap: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
        gif: "image/gif",
      };
      const mediaType = mimeMap[ext] ?? "image/jpeg";

      const message = await anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType as "image/jpeg", data: base64 },
              },
              {
                type: "text",
                text: `Extract ALL text content from this image. This is a reviewer/study material. 
                Return only the raw text content as it appears, preserving the structure and meaning. 
                Do not add any commentary or explanation. Just the extracted text.`,
              },
            ],
          },
        ],
      });

      extractedText = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");
    }

    // Handle PDFs — use Claude with document support
    else if (ext === "pdf") {
      const message = await anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              } as unknown as { type: "text"; text: string },
              {
                type: "text",
                text: `Extract ALL text content from this PDF. This is a reviewer/study material. 
                Return only the raw text content, preserving the structure and topics. 
                Do not add any commentary or explanation. Just the extracted text.`,
              },
            ],
          },
        ],
      });

      extractedText = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");
    }

    // Handle text/doc files
    else if (["txt", "md"].includes(ext)) {
      extractedText = Buffer.from(arrayBuffer).toString("utf-8");
    }

    // Handle docx — basic extraction via text parsing
    else if (["doc", "docx"].includes(ext)) {
      const message = await anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `I have a Word document that I need to extract text from. 
            The base64 content is: ${base64.slice(0, 100)}... (truncated)
            
            Since I cannot directly parse the docx, please respond with:
            "DOCX_EXTRACTION_NEEDED"
            
            I will handle this client-side.`,
          },
        ],
      });

      const resp = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

      if (resp.includes("DOCX_EXTRACTION_NEEDED")) {
        return NextResponse.json({
          extractedText: "",
          needsClientExtraction: true,
          fileType: "docx",
        });
      }
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: ${ext}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ extractedText: extractedText.trim() });
  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json({ error: "Text extraction failed" }, { status: 500 });
  }
}