import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Max 10MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    const base64 = buffer.toString("base64");

    const dataUri =
      `data:${file.type || "application/octet-stream"};base64,${base64}`;

    const result = await cloudinary.uploader.upload(
      dataUri,
      {
        folder: "reviewai",
        resource_type: "auto",
        type: "private",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      }
    );

    const publicId = result.public_id;
    const resourceType = result.resource_type;
    const format = result.format || "";

    if (!format) {
      throw new Error(
        "Cloudinary did not return a file format."
      );
    }

    const downloadUrl =
      cloudinary.utils.private_download_url(
        publicId,
        format,
        {
          resource_type: resourceType,
          type: "private",
          attachment: false,
        }
      );

    return NextResponse.json({
      url: downloadUrl,
      signedUrl: downloadUrl,
      publicId,
      resourceType,
      format,
      originalFilename: file.name,
    });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload failed.",
      },
      { status: 500 }
    );
  }
}