"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaThumb } from "./media-thumb";
import type { MediaItem } from "../types";

interface MediaGridProps {
  items: MediaItem[];
  selectedIds?: string[];
  onItemClick: (item: MediaItem) => void;
  className?: string;
}

export function MediaGrid({ items, selectedIds = [], onItemClick, className }: MediaGridProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6", className)}>
      {items.map((item) => {
        const selected = selectedIds.includes(item.id);
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onItemClick(item)}
            title={item.name}
            className={cn(
              "group relative overflow-hidden rounded-lg border text-left outline-none transition hover:ring-2 hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring",
              selected && "ring-2 ring-foreground hover:ring-foreground"
            )}
          >
            <MediaThumb url={item.url} name={item.name} contentType={item.contentType} alt={item.alt} />
            {selected && (
              <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
