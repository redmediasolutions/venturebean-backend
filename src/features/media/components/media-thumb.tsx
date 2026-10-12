/* eslint-disable @next/next/no-img-element */
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { isImage } from "../lib/media-utils";

interface MediaThumbProps {
  url: string;
  name: string;
  contentType?: string;
  alt?: string;
  className?: string;
}

/** Square preview: the image itself, or a file icon for PDFs etc. */
export function MediaThumb({ url, name, contentType, alt, className }: MediaThumbProps) {
  const image = contentType ? isImage(contentType) : /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url);
  return (
    <div className={cn("relative flex aspect-square items-center justify-center overflow-hidden bg-muted", className)}>
      {image ? (
        <img src={url} alt={alt || name} className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="flex flex-col items-center gap-2 p-3 text-center">
          <FileText className="size-7 text-muted-foreground" />
          <span className="line-clamp-2 text-[11px] break-all text-muted-foreground">{name}</span>
        </div>
      )}
    </div>
  );
}
