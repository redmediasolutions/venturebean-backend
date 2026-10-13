"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate, getErrorMessage } from "@/lib/format";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import type { Category } from "@/features/categories/types";
import type { CategoryWithDepth } from "@/features/categories/lib/category-tree";
import { buildPostUrl } from "@/features/settings/hooks/use-site-settings";
import type { SiteSettings } from "@/features/settings/types";
import { deletePost } from "../repository/post-repository";
import { duplicatePost } from "../services/post-service";
import { PostStatusBadge } from "../lib/post-status";
import type { Post } from "../types";

const PAGE_SIZE = 20;
const ALL = "all";
type StatusFilter = "all" | "published" | "draft";

interface PostsTableProps {
  posts: Post[];
  loading: boolean;
  categories: Category[];
  tree: CategoryWithDepth[];
  categoriesById: Map<string, Category>;
  settings: SiteSettings;
  initialCategory?: string;
  /** Where the post screens live, e.g. "/posts" or "/content/insights". */
  basePath?: string;
  /** Word used in buttons and messages, e.g. "post" or "insight". */
  itemLabel?: string;
  /** Hide the category dropdown (sections are already one category). */
  showCategoryFilter?: boolean;
}

export function PostsTable({
  posts,
  loading,
  categories,
  tree,
  categoriesById,
  settings,
  initialCategory,
  basePath = "/posts",
  itemLabel = "post",
  showCategoryFilter = true,
}: PostsTableProps) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState(initialCategory || ALL);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput);
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<Post | null>(null);

  const counts = useMemo(
    () => ({
      all: posts.length,
      published: posts.filter((p) => p.status === "published").length,
      draft: posts.filter((p) => p.status === "draft").length,
    }),
    [posts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts
      .filter((p) => status === "all" || p.status === status)
      .filter((p) => category === ALL || p.categoryIds.includes(category))
      .filter((p) => !q || p.title.toLowerCase().includes(q) || p.slug.includes(q));
  }, [posts, status, category, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "published", label: "Published" },
    { key: "draft", label: "Drafts" },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1 text-sm">
          {statusTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setStatus(t.key);
                setPage(0);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground",
                status === t.key && "bg-muted text-foreground"
              )}
            >
              {t.label} <span className="ml-1 text-xs tabular-nums opacity-70">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {showCategoryFilter && (
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {tree.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {"— ".repeat(c.depth)}
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
          <div className="relative sm:w-64">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${itemLabel}s…`}
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={posts.length === 0 ? `No ${itemLabel}s yet` : `No ${itemLabel}s match these filters`}
          description={posts.length === 0 ? `Add your first ${itemLabel} — it will appear on your website once published.` : undefined}
          action={
            posts.length === 0 ? (
              <Button asChild>
                <Link href={`${basePath}/new`}>
                  <Plus /> New {itemLabel}
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setStatus("all");
                  setCategory(ALL);
                  setSearchInput("");
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sm:min-w-[280px]">Title</TableHead>
                {showCategoryFilter && <TableHead className="hidden md:table-cell">Categories</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const url = p.status === "published" ? buildPostUrl(settings, p.slug) : null;
                return (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`${basePath}/${p.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                          {p.featuredImage && <img src={p.featuredImage.url} alt="" className="size-full object-cover" loading="lazy" />}
                        </div>
                        <div className="max-w-[50vw] min-w-0 sm:max-w-md">
                          <p className="truncate font-medium">{p.title || <span className="text-muted-foreground">(no title)</span>}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">/{p.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    {showCategoryFilter && (
                    <TableCell className="hidden md:table-cell">
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {p.categoryIds.length === 0 && <span className="text-muted-foreground">—</span>}
                        {p.categoryIds.map((id) =>
                          categoriesById.get(id) ? (
                            <Badge key={id} variant="secondary" className="font-normal">
                              {categoriesById.get(id)!.name}
                            </Badge>
                          ) : null
                        )}
                      </div>
                    </TableCell>
                    )}
                    <TableCell>
                      <PostStatusBadge post={p} />
                    </TableCell>
                    <TableCell className="hidden text-sm whitespace-nowrap text-muted-foreground sm:table-cell">
                      {p.status === "published" ? (
                        <>
                          <span className="block text-xs">Published</span>
                          {formatDate(p.publishedAt)}
                        </>
                      ) : (
                        <>
                          <span className="block text-xs">Last modified</span>
                          {formatDate(p.updatedAt)}
                        </>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Actions">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`${basePath}/${p.id}`}>
                              <Pencil /> Edit
                            </Link>
                          </DropdownMenuItem>
                          {url && (
                            <DropdownMenuItem asChild>
                              <a href={url} target="_blank" rel="noreferrer">
                                <ExternalLink /> View on website
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                const res = await duplicatePost(p, categories);
                                toast.success("Copy created as a draft");
                                router.push(`${basePath}/${res.id}`);
                              } catch (err) {
                                toast.error(getErrorMessage(err));
                              }
                            }}
                          >
                            <Copy /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(p)}>
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.title || "this post"}”?`}
        description="It will be removed from your website. This cannot be undone."
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deletePost(deleting.id);
            toast.success("Post deleted");
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </div>
  );
}
