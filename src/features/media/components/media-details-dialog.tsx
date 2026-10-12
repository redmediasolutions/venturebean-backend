"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Copy, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDate, formatFileSize, getErrorMessage } from "@/lib/format";
import { isImage } from "../lib/media-utils";
import { deleteMediaItem, updateMediaDetails } from "../repository/media-repository";
import { MediaThumb } from "./media-thumb";
import type { MediaItem } from "../types";

interface MediaDetailsDialogProps {
  item: MediaItem | null;
  onClose: () => void;
}

export function MediaDetailsDialog({ item, onClose }: MediaDetailsDialogProps) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">{item && <Details key={item.id} item={item} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function Details({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const [alt, setAlt] = useState(item.alt);
  const [name, setName] = useState(item.name);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateMediaDetails(item.id, { alt: alt.trim(), name: name.trim() || item.name });
      toast.success("Saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="truncate pr-6">{item.name}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="flex items-center justify-center overflow-hidden rounded-lg border bg-muted/50">
          {isImage(item.contentType) ? (
            <img src={item.url} alt={item.alt || item.name} className="max-h-[420px] w-auto object-contain" />
          ) : (
            <MediaThumb url={item.url} name={item.name} contentType={item.contentType} className="w-40 bg-transparent" />
          )}
        </div>
        <div className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Uploaded</dt>
            <dd>{formatDate(item.createdAt, true)}</dd>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="truncate">{item.contentType}</dd>
            <dt className="text-muted-foreground">Size</dt>
            <dd>{formatFileSize(item.size)}</dd>
            {item.width && item.height && (
              <>
                <dt className="text-muted-foreground">Dimensions</dt>
                <dd>
                  {item.width} × {item.height}px
                </dd>
              </>
            )}
          </dl>

          <FormField label="File name" htmlFor="media-name">
            <Input id="media-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          {isImage(item.contentType) && (
            <FormField label="Alt text" htmlFor="media-alt" help="Describe the image for screen readers and Google.">
              <Input id="media-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="e.g. Team photo at the office" />
            </FormField>
          )}
          <FormField label="File URL">
            <div className="flex gap-2">
              <Input readOnly value={item.url} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(item.url);
                  toast.success("URL copied");
                }}
                aria-label="Copy URL"
              >
                <Copy />
              </Button>
            </div>
          </FormField>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Save
            </Button>
            <Button variant="outline" asChild>
              <a href={item.url} target="_blank" rel="noreferrer">
                <ExternalLink /> Open
              </a>
            </Button>
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Delete
            </Button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this file permanently?"
        description="It will be removed from the Media Library and from storage. Posts that use it will show a broken image."
        onConfirm={async () => {
          try {
            await deleteMediaItem(item);
            toast.success("File deleted");
            onClose();
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </>
  );
}
