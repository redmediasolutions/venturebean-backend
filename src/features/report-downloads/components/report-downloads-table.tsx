"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDate, getErrorMessage } from "@/lib/format";
import { deleteReportDownload } from "../repository/report-download-repository";
import type { ReportDownload } from "../types";

interface ReportDownloadsTableProps {
  downloads: ReportDownload[];
  /** Hide the Report column when the list is already filtered to one report. */
  showReport: boolean;
}

export function ReportDownloadsTable({ downloads, showReport }: ReportDownloadsTableProps) {
  const [deleting, setDeleting] = useState<ReportDownload | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              {showReport && <TableHead>Report</TableHead>}
              <TableHead className="w-44">Downloaded</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {downloads.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  <a href={`mailto:${d.email}`} className="hover:underline">
                    {d.email}
                  </a>
                </TableCell>
                {showReport && (
                  <TableCell className="max-w-md truncate text-muted-foreground" title={d.postTitle}>
                    {d.pageUrl ? (
                      <a href={d.pageUrl} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
                        {d.postTitle || d.postSlug}
                      </a>
                    ) : (
                      d.postTitle || d.postSlug
                    )}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground tabular-nums">{formatDate(d.createdAt, true)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label="More">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(d)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this entry?"
        description={deleting ? `${deleting.email} — ${deleting.postTitle || deleting.postSlug}` : undefined}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteReportDownload(deleting.id);
            toast.success("Entry deleted.");
            setDeleting(null);
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </>
  );
}
