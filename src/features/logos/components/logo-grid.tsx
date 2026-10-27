"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ArrowLeft, ArrowRight, EyeOff, GripVertical, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Logo } from "../types";

interface LogoGridProps {
  logos: Logo[];
  groupName: (id: string | null) => string | null;
  onOpen: (logo: Logo) => void;
  onMove: (logo: Logo, dir: -1 | 1) => void;
  /** Drag and drop: put `dragged` where `target` is. */
  onReorder: (dragged: Logo, target: Logo) => void;
  showGroup: boolean;
}

/**
 * Logo cards. Drag a card onto another to change the order, or use the
 * arrows that appear on hover. The number is the logo's position on the website.
 */
export function LogoGrid({ logos, groupName, onOpen, onMove, onReorder, showGroup }: LogoGridProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {logos.map((logo, i) => {
        const hidden = !logo.published || (!logo.onHome && !logo.onClientsPage);
        return (
          <div
            key={logo.id}
            draggable
            onDragStart={(e) => {
              setDragId(logo.id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", logo.id);
            }}
            onDragOver={(e) => {
              if (!dragId || dragId === logo.id) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overId !== logo.id) setOverId(logo.id);
            }}
            onDragLeave={() => setOverId((id) => (id === logo.id ? null : id))}
            onDrop={(e) => {
              e.preventDefault();
              const dragged = logos.find((l) => l.id === dragId);
              setDragId(null);
              setOverId(null);
              if (dragged && dragged.id !== logo.id) onReorder(dragged, logo);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            className={cn(
              "group relative cursor-grab overflow-hidden rounded-xl border bg-card transition hover:border-foreground/30 hover:shadow-sm active:cursor-grabbing",
              dragId === logo.id && "opacity-40",
              overId === logo.id && "ring-2 ring-foreground ring-offset-2"
            )}
          >
            <button type="button" onClick={() => onOpen(logo)} className="block w-full text-left">
              <div className={cn("flex aspect-[4/3] items-center justify-center bg-white p-5", hidden && "opacity-40")}>
                {logo.image ? (
                  <img src={logo.image.url} alt={logo.name} draggable={false} className="max-h-full max-w-full object-contain" loading="lazy" />
                ) : (
                  <ImageOff className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1 border-t px-3 py-2">
                <p className="truncate text-sm font-medium" title={logo.name}>
                  {logo.name}
                </p>
                {logo.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground" title={logo.description}>
                    {logo.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {showGroup && groupName(logo.groupId) && (
                    <Badge variant="secondary" className="font-normal">
                      {groupName(logo.groupId)}
                    </Badge>
                  )}
                  {!logo.published && <Badge variant="outline">Hidden</Badge>}
                  {logo.published && logo.onHome && (
                    <Badge variant="outline" className="font-normal">
                      Home
                    </Badge>
                  )}
                  {logo.published && !logo.onClientsPage && (
                    <Badge variant="outline" className="gap-1 font-normal">
                      <EyeOff /> Clients page
                    </Badge>
                  )}
                </div>
              </div>
            </button>
            <span className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-md border bg-background/90 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground shadow-sm">
              {logo.order ?? i + 1}
            </span>
            <div className="absolute top-2 right-2 left-2 flex justify-between opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => onMove(logo, -1)}
                className="rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur disabled:invisible"
                aria-label="Move earlier"
              >
                <ArrowLeft className="size-3.5" />
              </button>
              <GripVertical className="mt-1 size-3.5 text-muted-foreground" aria-hidden />
              <button
                type="button"
                disabled={i === logos.length - 1}
                onClick={() => onMove(logo, 1)}
                className="rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur disabled:invisible"
                aria-label="Move later"
              >
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
