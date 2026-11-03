import type { ReportDownload } from "../types";

const cell = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/** Download the list as a CSV file (opens in Excel / Google Sheets). */
export function exportReportDownloadsCsv(rows: ReportDownload[], fileName = "report-downloads.csv") {
  const lines = [
    ["Email", "Report", "Date", "Page"].join(","),
    ...rows.map((r) =>
      [r.email, r.postTitle, r.createdAt ? r.createdAt.toISOString().replace("T", " ").slice(0, 16) : "", r.pageUrl].map(cell).join(",")
    ),
  ];
  // BOM so Excel reads accented characters correctly.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
