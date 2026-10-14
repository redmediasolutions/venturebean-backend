/**
 * Media Library — files are uploaded through /api/media, which stores them
 * on Amazon S3 (same bucket as the WordPress importer).
 */
import { apiDelete, apiGet, apiPatch, apiUpload, toDate } from "@/lib/api-client";
import { invalidate } from "@/hooks/use-api-resource";
import { readImageSize } from "../lib/media-utils";
import type { MediaItem } from "../types";

export const MEDIA_KEY = "media";

export function mapMedia(raw: Record<string, unknown>): MediaItem {
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    url: String(raw.url ?? ""),
    path: String(raw.path ?? ""),
    contentType: String(raw.contentType ?? ""),
    size: typeof raw.size === "number" ? raw.size : 0,
    alt: String(raw.alt ?? ""),
    width: num(raw.width),
    height: num(raw.height),
    createdAt: toDate(raw.createdAt),
  };
}

export async function fetchMedia(): Promise<MediaItem[]> {
  const { media } = await apiGet<{ media: Record<string, unknown>[] }>("/api/media");
  return (media ?? []).map(mapMedia);
}

/** Upload a file to the Media Library (S3). */
export async function uploadMediaFile(file: File, onProgress?: (percent: number) => void): Promise<MediaItem> {
  const size = await readImageSize(file);
  const form = new FormData();
  form.append("file", file);
  if (size) {
    form.append("width", String(size.width));
    form.append("height", String(size.height));
  }
  const { media } = await apiUpload<{ media: Record<string, unknown> }>("/api/media", form, onProgress);
  invalidate(MEDIA_KEY);
  return mapMedia(media);
}

export async function updateMediaDetails(id: string, data: { alt: string; name: string }) {
  await apiPatch(`/api/media/${encodeURIComponent(id)}`, data);
  invalidate(MEDIA_KEY);
}

export async function deleteMediaItem(item: MediaItem) {
  await apiDelete(`/api/media/${encodeURIComponent(item.id)}`);
  invalidate(MEDIA_KEY);
}
