"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryWithDepth } from "../lib/category-tree";

interface CategoryChecklistProps {
  tree: CategoryWithDepth[];
  value: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
}

/** WordPress-style list of tick boxes for choosing a post's categories. */
export function CategoryChecklist({ tree, value, onChange, loading }: CategoryChecklistProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-3/4" />
        ))}
      </div>
    );
  }
  if (tree.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No categories yet.{" "}
        <Link href="/categories" className="text-foreground underline underline-offset-4">
          Create one
        </Link>
      </p>
    );
  }
  return (
    <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
      {tree.map((c) => {
        const checked = value.includes(c.id);
        return (
          <label
            key={c.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-md py-1.5 pr-2 text-sm hover:bg-muted/60"
            style={{ paddingLeft: 8 + c.depth * 18 }}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(on) => onChange(on ? [...value, c.id] : value.filter((id) => id !== c.id))}
            />
            {c.name}
          </label>
        );
      })}
    </div>
  );
}
