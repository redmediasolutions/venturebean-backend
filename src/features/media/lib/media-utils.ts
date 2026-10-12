import type { MediaItem, MediaRef } from "../types";

export const MAX_UPLOAD_MB = 20;

export const isImage = (contentType?: string) => Boolean(contentType?.startsWith("image/"));

export function toMediaRef(item: MediaItem): MediaRef {
  return {
    id: item.id,
    url: item.url,
    path: item.path,
    name: item.name,
    alt: item.alt,
    contentType: item.contentType,
    width: item.width,
    height: item.height,
  };
}

/** "My Photo (1).JPG" → "my-photo-1.jpg" — safe for storage paths. */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${base || "file"}${ext ? "." + ext : ""}`;
}

/** Read an image's width/height in the browser before uploading. */
export function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
