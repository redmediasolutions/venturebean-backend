"use client";

import { useMemo, useState } from "react";
import { Download, FileDown, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useReportDownloads } from "@/features/report-downloads/hooks/use-report-downloads";
import { ReportDownloadsTable } from "@/features/report-downloads/components/report-downloads-table";
import { exportReportDownloadsCsv } from "@/features/report-downloads/lib/export-csv";
import type { ReportOption } from "@/features/report-downloads/types";

const ALL = "__all__";

export default function ReportDownloadsPage() {
  const { downloads, loading, error } = useReportDownloads();
  const [report, setReport] = useState(ALL);
  const [search, setSearch] = useState("");

  // Reports that have been downloaded, most popular first.
  const reports = useMemo<ReportOption[]>(() => {
    const map = new Map<string, ReportOption>();
    for (const d of downloads) {
      const r = map.get(d.postSlug) ?? { slug: d.postSlug, title: d.postTitle || d.postSlug, count: 0 };
      r.count++;
      map.set(d.postSlug, r);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [downloads]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return downloads
      .filter((d) => report === ALL || d.postSlug === report)
      .filter((d) => !q || d.email.toLowerCase().includes(q) || d.postTitle.toLowerCase().includes(q));
  }, [downloads, report, search]);

  const stats = useMemo(() => {
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      total: downloads.length,
      people: new Set(downloads.map((d) => d.email.toLowerCase())).size,
      lastMonth: downloads.filter((d) => d.createdAt && d.createdAt.getTime() >= monthAgo).length,
    };
  }, [downloads]);

  const currentReport = reports.find((r) => r.slug === report);

  return (
    <>
      <PageHeader
        title="Report downloads"
        description="Emails people entered on the website before downloading a report (“Download the full analysis”)."
        actions={
          <Button
            variant="outline"
            disabled={!visible.length}
            onClick={() => exportReportDownloadsCsv(visible, currentReport ? `report-downloads-${currentReport.slug}.csv` : "report-downloads.csv")}
          >
            <FileDown /> Export CSV
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Downloads", value: stats.total },
          { label: "Different people", value: stats.people },
          { label: "Last 30 days", value: stats.lastMonth },
        ].map((s) => (
          <Card key={s.label} className="py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold tabular-nums">{loading ? "–" : s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search emails…" className="pl-9" />
        </div>
        <Select value={report} onValueChange={setReport}>
          <SelectTrigger className="sm:w-80">
            <SelectValue placeholder="All reports" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All reports</SelectItem>
            {reports.map((r) => (
              <SelectItem key={r.slug} value={r.slug}>
                {r.title} ({r.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={Download} title="Couldn't load report downloads" description={error} />
      ) : !downloads.length ? (
        <EmptyState
          icon={Download}
          title="No downloads yet"
          description="When someone enters their email to download a report on the website, it appears here."
        />
      ) : !visible.length ? (
        <EmptyState icon={Search} title="Nothing matches" description="Try a different search or report." />
      ) : (
        <ReportDownloadsTable downloads={visible} showReport={report === ALL} />
      )}
    </>
  );
}
