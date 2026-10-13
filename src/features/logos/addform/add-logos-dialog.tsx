"use client";

/**
 * Upload one or many logos at once. Each image becomes a logo, named after
 * its file (rename later by clicking it).
 */
import { useEffect, useState } from "react";
import { Images, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { getErrorMessage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaDropzone } from "@/features/media/components/media-dropzone";
import { MediaPickerDialog } from "@/features/media/components/media-picker-dialog";
import { useUpload } from "@/features/media/hooks/use-upload";
import { toMediaRef } from "@/features/media/lib/media-utils";
import type { MediaRef } from "@/features/media/types";
import type { Category } from "@/features/categories/types";
import { nameFromFileName } from "../lib/logo-utils";
import { createLogo } from "../services/logo-service";
import { LogoGroupSelect } from "../components/logo-group-select";
import type { Logo, LogoGroup } from "../types";

interface AddLogosDialogProps {
  groups: LogoGroup[];
  defaultGroupId: string | null;
  rootId: string;
  categories: Category[];
  logos: Logo[];
}

export function AddLogosDialog({ groups, defaultGroupId, rootId, categories, logos }: AddLogosDialogProps) {
  const { user } = useAuth();
  const { uploads, upload } = useUpload();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(defaultGroupId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setGroupId(defaultGroupId);
  }, [open, defaultGroupId]);

  async function addAll(images: MediaRef[]) {
    if (!images.length) return;
    setBusy(true);
    try {
      let next = Math.max(0, ...logos.map((l) => l.order ?? 0)) + 1;
      const author = { uid: user?.uid ?? "", name: user?.displayName || user?.email || "" };
      for (const image of images) {
        const name = nameFromFileName(image.name);
        await createLogo(
          { name, image: { ...image, alt: image.alt || name }, groupId, order: next++, size: null, onHome: true, onClientsPage: true, published: true },
          rootId,
          categories,
          author
        );
      }
      toast.success(images.length === 1 ? "Logo added" : `${images.length} logos added`, {
        description: "Click a logo to rename it or change where it shows.",
      });
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload /> Add logos
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && uploads.length === 0 && setOpen(o)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add logos</DialogTitle>
            <DialogDescription>Drop in one or many logo images. Each one becomes a logo on your website.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Put them in this group</Label>
            <LogoGroupSelect groups={groups} value={groupId} onChange={setGroupId} />
          </div>
          <MediaDropzone accept="image/*" uploads={uploads} onFiles={async (files) => addAll((await upload(files)).map(toMediaRef))} />
          <DialogFooter className="items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => setPickerOpen(true)} disabled={busy}>
              <Images /> Choose from Media library
            </Button>
            {busy && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Adding…
              </span>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MediaPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} kind="image" multiple title="Choose logos" onSelect={addAll} />
    </>
  );
}
