"use client";

import { useApiResource } from "@/hooks/use-api-resource";
import { fetchReportDownloads, REPORT_DOWNLOADS_KEY } from "../repository/report-download-repository";
import type { ReportDownload } from "../types";

const EMPTY: ReportDownload[] = [];

/** Every report download, newest first. */
export function useReportDownloads() {
  const { data, loading, error, refresh } = useApiResource(REPORT_DOWNLOADS_KEY, fetchReportDownloads, EMPTY);
  return { downloads: data, loading, error, refresh };
}
