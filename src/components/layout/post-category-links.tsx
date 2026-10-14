"use client";

import Link from "next/link";
import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { postsPath } from "@/features/posts/lib/post-paths";
import { LOGOS_ROOT } from "@/features/logos/lib/logo-utils";

/**
 * Sidebar links for every post category → /posts/<category>.
 * Updates live when a category is added. Logo groups are left out (they live under Logos).
 */
export function PostCategoryLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { tree, categories } = useCategories();

  // Hide the logo categories ("Clients" and everything below it).
  const logoRoot = categories.find((c) => c.slug === LOGOS_ROOT.slug);
  const hidden = new Set<string>(logoRoot ? [logoRoot.id] : []);
  for (let grew = true; grew; ) {
    grew = false;
    for (const c of categories) if (c.parentId && hidden.has(c.parentId) && !hidden.has(c.id)) hidden.add(c.id), (grew = true);
  }
  const items = tree.filter((c) => !hidden.has(c.id));

  return (
    <>
      {items.map((c) => {
        const href = postsPath(c.slug);
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={c.id}
            href={href}
            onClick={onNavigate}
            title={c.name}
            className={cn(
              "flex items-center gap-3 rounded-md py-1.5 pr-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
              active && "bg-sidebar-accent font-medium text-foreground"
            )}
            style={{ paddingLeft: 10 + c.depth * 14 }}
          >
            <Folder className="size-4 shrink-0 opacity-70" />
            <span className="truncate">{c.name}</span>
          </Link>
        );
      })}
    </>
  );
}
