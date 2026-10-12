"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/format";
import { MAX_UPLOAD_MB } from "../lib/media-utils";
import { uploadMediaFile } from "../repository/media-repository";
import type { MediaItem } from "../types";

export interface UploadProgress {
  id: string;
  name: string;
  percent: number;
  error?: string;
}

/** Upload one or more files and keep track of their progress. */
export function useUpload() {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  async function upload(files: File[]): Promise<MediaItem[]> {
    const done: MediaItem[] = [];
    const jobs = files.map(async (file) => {
      const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`;
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        toast.error(`“${file.name}” is larger than ${MAX_UPLOAD_MB} MB.`);
        return;
      }
      setUploads((u) => [...u, { id, name: file.name, percent: 0 }]);
      try {
        const item = await uploadMediaFile(file, (percent) =>
          setUploads((u) => u.map((x) => (x.id === id ? { ...x, percent } : x)))
        );
        done.push(item);
        setUploads((u) => u.filter((x) => x.id !== id));
      } catch (err) {
        const message = getErrorMessage(err);
        toast.error(`Upload failed: ${file.name}`, { description: message });
        setUploads((u) => u.filter((x) => x.id !== id));
      }
    });
    await Promise.all(jobs);
    if (done.length) toast.success(done.length === 1 ? "File uploaded" : `${done.length} files uploaded`);
    return done;
  }

  return { uploads, upload, isUploading: uploads.length > 0 };
}
