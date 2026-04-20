import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function truncate(str: string, maxLength: number) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  }).format(date);
}

export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getFileExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export const SUPPORTED_FILE_TYPES = [
  "pdf",
  "png", "jpg", "jpeg", "webp", "gif",
  "heic", "heif",
  "doc", "docx",
  "pptx",
  "xlsx", "xlsm",
  "txt", "md",
  "odt", "odp", "ods",
];

export function isSupportedFile(filename: string) {
  return SUPPORTED_FILE_TYPES.includes(getFileExtension(filename));
}

export function getFileTypeLabel(ext: string): string {
  const labels: Record<string, string> = {
    pdf: "PDF",
    png: "Image", jpg: "Image", jpeg: "Image", webp: "Image", gif: "Image",
    heic: "iPhone Photo", heif: "iPhone Photo",
    doc: "Word", docx: "Word",
    pptx: "PowerPoint",
    xlsx: "Excel", xlsm: "Excel",
    txt: "Text", md: "Markdown",
    odt: "OpenDoc", odp: "Presentation", ods: "Spreadsheet",
  };
  return labels[ext] ?? ext.toUpperCase();
}