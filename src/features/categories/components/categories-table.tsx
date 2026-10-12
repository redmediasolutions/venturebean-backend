"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Folder, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { getErrorMessage } from "@/lib/format";
import { CategoryForm } from "../addform/category-form";
import { deleteCategory } from "../services/category-service";
import type { CategoryWithDepth } from "../lib/category-tree";
import type { Category } from "../types";

interface CategoriesTableProps {
  categories: Category[];
  tree: CategoryWithDepth[];
  postCounts: Map<string, number>;
  loading: boolean;
}

export function CategoriesTable({ categories, tree, postCounts, loading }: CategoriesTableProps) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tree;
    return tree.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q));
  }, [tree, search]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Folder}
          title={search ? "No categories match your search" : "No categories yet"}
          description={search ? undefined : "Create categories like “Blog” or “News” to group your posts."}
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Posts</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <button className="text-left font-medium hover:underline" onClick={() => setEditing(c)}>
                      <span className="text-muted-foreground">{"— ".repeat(c.depth)}</span>
                      {c.name}
                    </button>
                  </TableCell>
                  <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">
                    {c.description || "—"}
                  </TableCell>
                  <TableCell>
                    <code className="font-mono text-xs text-muted-foreground">{c.slug}</code>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Link href={`/posts?category=${c.id}`} className="hover:underline">
                      {postCounts.get(c.id) ?? 0}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(c)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(c)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>Changes apply to your website straight away.</DialogDescription>
          </DialogHeader>
          {editing && (
            <CategoryForm
              key={editing.id}
              category={editing}
              categories={categories}
              tree={tree}
              onSaved={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.name}”?`}
        description="Posts in this category will NOT be deleted — they will just no longer be in this category. Sub-categories move up one level."
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteCategory(deleting, categories);
            toast.success("Category deleted");
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </div>
  );
}
