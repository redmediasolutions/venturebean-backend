"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_UPLOAD_MB } from "../lib/media-utils";
import type { UploadProgress } from "../hooks/use-upload";

interface MediaDropzoneProps {
  accept?: string;
  multiple?: boolean;
  uploads: UploadProgress[];
  onFiles: (files: File[]) => void;
  className?: string;
}

/** Drag & drop area for uploading files. */
export function MediaDropzone({ accept, multiple = true, uploads, onFiles, className }: MediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length) onFiles(multiple ? files : files.slice(0, 1));
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors hover:bg-muted/50",
          dragging && "border-foreground bg-muted/60"
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Upload className="size-5" />
        </div>
        <p className="text-sm font-medium">Drop files here, or click to browse</p>
        <p className="text-xs text-muted-foreground">Images, PDFs and documents up to {MAX_UPLOAD_MB} MB</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
      {uploads.length > 0 && (
        <ul className="space-y-2">
          {uploads.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{u.name}</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${u.percent}%` }} />
              </div>
              <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{u.percent}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
