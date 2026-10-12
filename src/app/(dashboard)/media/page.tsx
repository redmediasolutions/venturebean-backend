"use client";

import { useMemo, useState } from "react";
import { ImageIcon, Search, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { useMedia } from "@/features/media/hooks/use-media";
import { useUpload } from "@/features/media/hooks/use-upload";
import { isImage } from "@/features/media/lib/media-utils";
import { MediaDropzone } from "@/features/media/components/media-dropzone";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaDetailsDialog } from "@/features/media/components/media-details-dialog";
import type { MediaItem } from "@/features/media/types";

export default function MediaPage() {
  const { media, loading } = useMedia();
  const { uploads, upload } = useUpload();
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [selected, setSelected] = useState<MediaItem | null>(null);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return media
      .filter((m) => type === "all" || (type === "images" ? isImage(m.contentType) : !isImage(m.contentType)))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.alt.toLowerCase().includes(q));
  }, [media, search, type]);

  // Keep the open details dialog in sync with live data.
  const current = selected ? media.find((m) => m.id === selected.id) ?? null : null;

  return (
    <>
      <PageHeader
        title="Media Library"
        description="All images and files you've uploaded. Click a file to edit its details or copy its link."
        actions={
          <Button onClick={() => setShowUpload((s) => !s)}>
            <Upload /> Upload files
          </Button>
        }
      />

      {(showUpload || uploads.length > 0) && <MediaDropzone className="mb-6" uploads={uploads} onFiles={upload} />}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative sm:w-72">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search media…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All files</SelectItem>
            <SelectItem value="images">Images</SelectItem>
            <SelectItem value="documents">Documents</SelectItem>
          </SelectContent>
        </Select>
        <p className="self-center text-sm text-muted-foreground sm:ml-auto">
          {items.length} item{items.length === 1 ? "" : "s"}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={media.length === 0 ? "Your Media Library is empty" : "No files match"}
          description={media.length === 0 ? "Upload images and documents to use them in your posts." : undefined}
          action={
            media.length === 0 && (
              <Button onClick={() => setShowUpload(true)}>
                <Upload /> Upload files
              </Button>
            )
          }
        />
      ) : (
        <MediaGrid items={items} onItemClick={setSelected} />
      )}

      <MediaDetailsDialog item={current} onClose={() => setSelected(null)} />
    </>
  );
}
