"use client";

/**
 * Inputs used inside forms:
 *  - <ImageInput>   one image (featured image, ACF "Image" field)
 *  - <GalleryInput> several images (ACF "Gallery" field)
 *  - <FileInput>    one file of any type, e.g. a PDF (ACF "File" field)
 */
import { useState } from "react";
import { ArrowLeft, ArrowRight, FileText, ImagePlus, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaPickerDialog } from "./media-picker-dialog";
import { MediaThumb } from "./media-thumb";
import type { MediaRef } from "../types";

export function ImageInput({
  value,
  onChange,
  showAlt = false,
}: {
  value: MediaRef | null;
  onChange: (v: MediaRef | null) => void;
  showAlt?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      {value ? (
        <div className="group relative overflow-hidden rounded-lg border">
          <button type="button" onClick={() => setOpen(true)} className="block w-full" title="Replace image">
            <MediaThumb url={value.url} name={value.name} contentType={value.contentType} alt={value.alt} className="aspect-video" />
          </button>
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="absolute top-2 right-2 opacity-90 shadow"
            onClick={() => onChange(null)}
            aria-label="Remove image"
          >
            <X />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <ImagePlus className="size-5" />
          Choose image
        </button>
      )}
      {value && showAlt && (
        <Input
          value={value.alt}
          onChange={(e) => onChange({ ...value, alt: e.target.value })}
          placeholder="Alt text (describe the image)"
          className="h-8 text-xs"
        />
      )}
      {value && (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
          Replace image
        </Button>
      )}
      <MediaPickerDialog open={open} onOpenChange={setOpen} kind="image" onSelect={(items) => items[0] && onChange(items[0])} />
    </div>
  );
}

export function GalleryInput({ value, onChange }: { value: MediaRef[]; onChange: (v: MediaRef[]) => void }) {
  const [open, setOpen] = useState(false);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {value.map((img, i) => (
            <div key={`${img.path}-${i}`} className="group relative overflow-hidden rounded-md border">
              <MediaThumb url={img.url} name={img.name} contentType={img.contentType} alt={img.alt} />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition group-hover:opacity-100">
                <button type="button" className="rounded p-1 text-white hover:bg-white/20" onClick={() => move(i, i - 1)} aria-label="Move left">
                  <ArrowLeft className="size-3.5" />
                </button>
                <button type="button" className="rounded p-1 text-white hover:bg-white/20" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove">
                  <X className="size-3.5" />
                </button>
                <button type="button" className="rounded p-1 text-white hover:bg-white/20" onClick={() => move(i, i + 1)} aria-label="Move right">
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ImagePlus /> {value.length ? "Add more images" : "Add images"}
      </Button>
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        kind="image"
        multiple
        title="Add images to gallery"
        onSelect={(items) => onChange([...value, ...items])}
      />
    </div>
  );
}

export function FileInput({ value, onChange }: { value: MediaRef | null; onChange: (v: MediaRef | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3 rounded-md border px-3 py-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <a href={value.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm hover:underline">
            {value.name}
          </a>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
            Replace
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(null)} aria-label="Remove file">
            <X />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Paperclip /> Choose file
        </Button>
      )}
      <MediaPickerDialog open={open} onOpenChange={setOpen} kind="any" onSelect={(items) => items[0] && onChange(items[0])} />
    </div>
  );
}
