/**
 * Report downloads are read and deleted through /api/report-downloads
 * (admin only). The website adds new ones directly to Firestore.
 */
import { apiDelete, apiGet, toDate } from "@/lib/api-client";
import { invalidate } from "@/hooks/use-api-resource";
import type { ReportDownload } from "../types";

export const REPORT_DOWNLOADS_KEY = "report-downloads";

function mapDownload(raw: Record<string, unknown>): ReportDownload {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    id: String(raw.id),
    email: s(raw.email),
    postId: s(raw.postId),
    postSlug: s(raw.postSlug),
    postTitle: s(raw.postTitle),
    pageUrl: s(raw.pageUrl),
    createdAt: toDate(raw.createdAt),
  };
}

export async function fetchReportDownloads(): Promise<ReportDownload[]> {
  const { downloads } = await apiGet<{ downloads: Record<string, unknown>[] }>("/api/report-downloads");
  return (downloads ?? []).map(mapDownload);
}

export async function deleteReportDownload(id: string): Promise<void> {
  await apiDelete(`/api/report-downloads/${encodeURIComponent(id)}`);
  invalidate(REPORT_DOWNLOADS_KEY);
}
