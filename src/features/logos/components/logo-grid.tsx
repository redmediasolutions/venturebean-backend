"use client";

/* eslint-disable @next/next/no-img-element */
import { ArrowLeft, ArrowRight, EyeOff, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Logo } from "../types";

interface LogoGridProps {
  logos: Logo[];
  groupName: (id: string | null) => string | null;
  onOpen: (logo: Logo) => void;
  onMove: (logo: Logo, dir: -1 | 1) => void;
  showGroup: boolean;
}

export function LogoGrid({ logos, groupName, onOpen, onMove, showGroup }: LogoGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {logos.map((logo, i) => {
        const hidden = !logo.published || (!logo.onHome && !logo.onClientsPage);
        return (
          <div key={logo.id} className="group relative overflow-hidden rounded-xl border bg-card transition hover:border-foreground/30 hover:shadow-sm">
            <button type="button" onClick={() => onOpen(logo)} className="block w-full text-left">
              <div className={cn("flex aspect-[4/3] items-center justify-center bg-white p-5", hidden && "opacity-40")}>
                {logo.image ? (
                  <img src={logo.image.url} alt={logo.name} className="max-h-full max-w-full object-contain" loading="lazy" />
                ) : (
                  <ImageOff className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1 border-t px-3 py-2">
                <p className="truncate text-sm font-medium">{logo.name}</p>
                <div className="flex flex-wrap gap-1">
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
