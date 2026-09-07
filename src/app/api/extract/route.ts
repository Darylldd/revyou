import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const {
      url,
      fileType,
      fileName,
    } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: "No file URL provided." },
        { status: 400 }
      );
    }

    const response = await fetch(url);

    if (!response.ok) {
      const cloudinaryError =
        response.headers.get("x-cld-error");

      console.error(
        "Cloudinary download failed:",
        response.status,
        cloudinaryError
      );

      throw new Error(
        `Could not download uploaded file. HTTP ${response.status}.`
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

    const ext =
      fileName
        ?.split(".")
        .pop()
        ?.toLowerCase() ||
      fileType?.toLowerCase() ||
      "";

    let extractedText = "";

    if (
      ["txt", "md", "csv"].includes(ext)
    ) {
      extractedText =
        buffer.toString("utf-8");
    } else if (ext === "pdf") {
      extractedText =
        await extractPdf(buffer);
    } else if (
      [
        "docx",
        "doc",
        "pptx",
        "xlsx",
        "xls",
        "xlsm",
        "odt",
        "odp",
        "ods",
      ].includes(ext)
    ) {
      extractedText =
        await extractOffice(buffer, ext);
    } else if (
      ["heic", "heif"].includes(ext)
    ) {
      extractedText =
        await extractHeic(buffer);
    } else if (
      [
        "png",
        "jpg",
        "jpeg",
        "webp",
        "gif",
      ].includes(ext)
    ) {
      extractedText =
        await extractImage(buffer, ext);
    } else {
      return NextResponse.json(
        {
          error: `Unsupported file type: .${ext}`,
        },
        { status: 400 }
      );
    }

    const cleaned =
      extractedText.trim();

    if (
      !cleaned ||
      cleaned.length < 5
    ) {
      return NextResponse.json(
        {
          error:
            "Could not extract useful content from this file.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      extractedText: cleaned,
    });
  } catch (error) {
    console.error(
      "Extraction error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Extraction failed.",
      },
      { status: 500 }
    );
  }
}

async function extractPdf(
  buffer: Buffer
): Promise<string> {
  try {
    const { extractText } =
      await import("unpdf");

    const uint8 =
      new Uint8Array(buffer);

    const { text } =
      await extractText(uint8, {
        mergePages: true,
      });

    const cleaned =
      (text ?? "").trim();

    if (
      !cleaned ||
      cleaned.length < 20
    ) {
      throw new Error(
        "This PDF appears to be scanned or image-based. Upload the pages as JPG or PNG instead, or use a text-based PDF."
      );
    }

    return cleaned;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message.includes("scanned") ||
      message.includes("image-based")
    ) {
      throw error;
    }

    throw new Error(
      "Failed to read PDF. Make sure it is a valid, non-password-protected, text-based PDF."
    );
  }
}

async function extractOffice(
  buffer: Buffer,
  ext: string
): Promise<string> {
  if (
    ["xlsx", "xls", "xlsm"].includes(ext)
  ) {
    return extractExcel(buffer);
  }

  if (ext === "doc") {
    try {
      const mammoth =
        await import("mammoth");

      const result =
        await mammoth.extractRawText({
          buffer,
        });

      const text =
        result.value?.trim() ?? "";

      if (text.length > 20) {
        return text;
      }
    } catch {
      // Continue to officeparser.
    }
  }

  try {
    const officeparser =
      await import("officeparser");

    const parser =
      (officeparser as any)
        .parseOffice ??
      (officeparser as any)
        .parseOfficeAsync;

    if (
      typeof parser !== "function"
    ) {
      throw new Error(
        "Office parser is not available."
      );
    }

    const text =
      await new Promise<string>(
        (resolve, reject) => {
          const options = {
            outputErrorToConsole:
              false,
            newlineDelimiter: "\n",
            ignoreNotes: false,
          };

          const callback = (
            error: any,
            data: string
          ) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(data || "");
          };

          try {
            const result =
              parser(
                buffer,
                options,
                callback
              );

            if (
              result &&
              typeof result.then ===
                "function"
            ) {
              result
                .then(
                  (value: string) =>
                    resolve(
                      value || ""
                    )
                )
                .catch(reject);
            } else if (
              result !==
                undefined &&
              result !== null
            ) {
              resolve(
                String(result)
              );
            }
          } catch (error) {
            reject(error);
          }
        }
      );

    const cleaned =
      text.trim();

    if (
      !cleaned ||
      cleaned.length < 5
    ) {
      throw new Error(
        `Could not extract text from this ${ext.toUpperCase()} file.`
      );
    }

    return cleaned;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message.includes(
        "Could not extract text"
      )
    ) {
      throw error;
    }

    throw new Error(
      `Failed to read .${ext} file. Make sure it is a valid, uncorrupted file.`
    );
  }
}

async function extractExcel(
  buffer: Buffer
): Promise<string> {
  try {
    const XLSX =
      await import("xlsx");

    const workbook =
      XLSX.read(buffer, {
        type: "buffer",
      });

    const lines: string[] = [];

    for (
      const sheetName of
        workbook.SheetNames
    ) {
      const sheet =
        workbook.Sheets[
          sheetName
        ];

      if (!sheet) continue;

      const csv =
        XLSX.utils.sheet_to_csv(
          sheet,
          {
            blankrows: false,
          }
        );

      const trimmed =
        csv.trim();

      if (trimmed) {
        lines.push(
          `=== Sheet: ${sheetName} ===`
        );

        lines.push(trimmed);
      }
    }

    const result =
      lines.join("\n\n").trim();

    if (
      !result ||
      result.length < 5
    ) {
      throw new Error(
        "Spreadsheet appears to be empty or has no readable content."
      );
    }

    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message.includes(
        "Spreadsheet appears"
      )
    ) {
      throw error;
    }

    throw new Error(
      "Failed to read spreadsheet. Make sure it is a valid Excel file."
    );
  }
}

async function extractHeic(
  buffer: Buffer
): Promise<string> {
  try {
    const sharp =
      await import("sharp");

    const jpegBuffer =
      await sharp.default(buffer)
        .jpeg({ quality: 90 })
        .toBuffer();

    return extractImage(
      jpegBuffer,
      "jpg"
    );
  } catch (error) {
    console.error(
      "HEIC conversion failed:",
      error
    );

    return extractImage(
      buffer,
      "jpg"
    );
  }
}

async function extractImage(
  buffer: Buffer,
  ext: string
): Promise<string> {
  const mimeMap: Record<
    string,
    string
  > = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };

  const mimeType =
    mimeMap[ext] ??
    "image/jpeg";

  const base64 =
    buffer.toString("base64");

  const dataUrl =
    `data:${mimeType};base64,${base64}`;

  const response =
    await groq.chat.completions.create({
      model:
        "qwen/qwen3.6-27b",

      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
            {
              type: "text",
              text: `You are a study material analyzer.

Extract all useful educational content from this image.

If it contains text:
- Transcribe the text accurately.
- Preserve headings and lists.
- Preserve numbered questions.
- Preserve answer choices.
- Preserve tables.

If it contains a diagram:
- Identify the diagram.
- Extract all labels.
- Describe relationships and processes.
- Include numbers, units, and important details.

If it contains handwritten notes:
- Transcribe them accurately.

If it contains educational illustrations:
- Describe the important educational information shown.

Do not say "NO_TEXT_FOUND" if the image contains educational information.

Return only the extracted educational content.
No preamble.`,
            },
          ],
        },
      ],

      temperature: 0.05,
      max_completion_tokens: 1200,
    });

  const text =
    response.choices[0]
      ?.message?.content ?? "";

  if (
    !text ||
    text.trim().length < 10
  ) {
    throw new Error(
      "Image appears blank or contains no educational content."
    );
  }

  return text.trim();
}