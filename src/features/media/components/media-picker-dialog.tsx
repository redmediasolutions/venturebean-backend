"use client";

import { useMemo, useState } from "react";
import { ImageIcon, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useMedia } from "../hooks/use-media";
import { useUpload } from "../hooks/use-upload";
import { isImage, toMediaRef } from "../lib/media-utils";
import { MediaDropzone } from "./media-dropzone";
import { MediaGrid } from "./media-grid";
import type { MediaKind, MediaRef } from "../types";

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (items: MediaRef[]) => void;
  kind?: MediaKind;
  multiple?: boolean;
  title?: string;
}

/** Popup to choose files from the Media Library (or upload new ones). */
export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  kind = "image",
  multiple = false,
  title,
}: MediaPickerDialogProps) {
  const { media, loading } = useMedia();
  const { uploads, upload } = useUpload();
  const [tab, setTab] = useState("library");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return media
      .filter((m) => (kind === "image" ? isImage(m.contentType) : true))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.alt.toLowerCase().includes(q));
  }, [media, kind, search]);

  function toggle(id: string) {
    setSelected((s) => (multiple ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : s[0] === id ? [] : [id]));
  }

  function close(o: boolean) {
    onOpenChange(o);
    if (!o) {
      setSelected([]);
      setSearch("");
      setTab("library");
    }
  }

  function confirm() {
    const chosen = selected.map((id) => media.find((m) => m.id === id)).filter(Boolean).map((m) => toMediaRef(m!));
    onSelect(chosen);
    close(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex h-[min(720px,calc(100vh-2rem))] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title ?? (kind === "image" ? "Choose image" : "Choose file")}</DialogTitle>
          <DialogDescription>
            {multiple ? "Select one or more items" : "Select an item"} from your Media Library, or upload a new one.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="library">Media Library</TabsTrigger>
              <TabsTrigger value="upload">Upload files</TabsTrigger>
            </TabsList>
            {tab === "library" && (
              <div className="relative w-full sm:w-60">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            )}
          </div>

          <TabsContent value="library" className="min-h-0 overflow-y-auto pt-1 pr-1">
            {loading ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={ImageIcon}
                title="Nothing here yet"
                description="Upload your first file to use it here."
                action={<Button onClick={() => setTab("upload")}>Upload files</Button>}
              />
            ) : (
              <MediaGrid items={items} selectedIds={selected} onItemClick={(m) => toggle(m.id)} className="sm:grid-cols-5 md:grid-cols-5 xl:grid-cols-5" />
            )}
          </TabsContent>

          <TabsContent value="upload" className="pt-1">
            <MediaDropzone
              accept={kind === "image" ? "image/*" : undefined}
              multiple={multiple}
              uploads={uploads}
              onFiles={async (files) => {
                const done = await upload(files);
                if (done.length) {
                  setSelected((s) => (multiple ? [...s, ...done.map((d) => d.id)] : [done[0].id]));
                  setTab("library");
                }
              }}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="items-center border-t pt-4">
          <p className="mr-auto text-sm text-muted-foreground">{selected.length} selected</p>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={selected.length === 0}>
            {multiple ? "Add selected" : "Use this"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
