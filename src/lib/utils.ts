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
    year: "numeric",
    month: "short",
    day: "numeric",
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
  "png",
  "jpg",
  "jpeg",
  "webp",
  "doc",
  "docx",
  "txt",
];

export function isSupportedFile(filename: string) {
  return SUPPORTED_FILE_TYPES.includes(getFileExtension(filename));
}