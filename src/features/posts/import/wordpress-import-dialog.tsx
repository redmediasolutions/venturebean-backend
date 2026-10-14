"use client";

/**
 * "Import from WordPress" dialog.
 *
 *  • Single post   — enter a WordPress post ID (hover a post title in WordPress to see it).
 *  • Whole category — pick a WordPress category (e.g. Coaching, ID 99) and import all its posts.
 *
 * Each post goes through /api/wordpress/import, which copies its images to S3.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleSlash, Download, Loader2, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Category, CategoryInput } from "@/features/categories/types";
import type { Post } from "../types";
import {
  fetchWordPressCategories,
  fetchWordPressCategoryPosts,
  findExistingImport,
  importWordPressPost,
  type ImportMode,
  type WordPressCategory,
  type WordPressPostSummary,
} from "./wordpress-import-service";

/** "Same as WordPress" — use the CMS category with the same slug, or create it. */
const AUTO_CATEGORY = "__auto__";

type RowState = "pending" | "importing" | "done" | "skipped" | "failed";

interface Row extends WordPressPostSummary {
  selected: boolean;
  existing: Post | undefined;
  state: RowState;
  error?: string;
}

interface WordPressImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  posts: Post[];
  /** Pre-select this CMS category (e.g. when opened from /posts/coaching). */
  defaultCategoryId?: string;
  createCategory: (input: CategoryInput) => Promise<string>;
  /** Called after posts were imported, so the list can refresh. */
  onImported: () => void;
}

export function WordPressImportDialog(props: WordPressImportDialogProps) {
  const { open, onOpenChange } = props;
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"single" | "category">("single");

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className={cn("transition-[max-width]", tab === "category" ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <DialogHeader>
          <DialogTitle>Import from WordPress</DialogTitle>
          <DialogDescription>
            Import VentureBean articles. Their images are copied to S3 and the original status and dates are kept.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => !busy && setTab(v as typeof tab)} className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="single" disabled={busy}>
              Single post
            </TabsTrigger>
            <TabsTrigger value="category" disabled={busy}>
              Whole category
            </TabsTrigger>
          </TabsList>
          <TabsContent value="single">{open && <SingleImport {...props} busy={busy} setBusy={setBusy} />}</TabsContent>
          <TabsContent value="category">{open && <CategoryImport {...props} busy={busy} setBusy={setBusy} />}</TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

type PaneProps = WordPressImportDialogProps & { busy: boolean; setBusy: (b: boolean) => void };

/* ------------------------------------------------------------------ shared bits */

function ModeSelect({ value, onChange, disabled }: { value: ImportMode; onChange: (m: ImportMode) => void; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="wp-mode">Content to import</Label>
      <Select value={value} onValueChange={(v) => onChange(v as ImportMode)} disabled={disabled}>
        <SelectTrigger id="wp-mode">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="full">Full article</SelectItem>
          <SelectItem value="summary">Summary only</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {value === "full" ? "The complete article, including formatting and images." : "Only the WordPress excerpt."}
      </p>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ single post */

function SingleImport({ categories, posts, defaultCategoryId, onImported, onOpenChange, busy, setBusy }: PaneProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [postId, setPostId] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? "");
  const [mode, setMode] = useState<ImportMode>("full");
  const [error, setError] = useState("");

  async function run() {
    setError("");
    const id = Number(postId.trim());
    if (!user) return setError("You must be signed in to import a WordPress article.");
    if (!Number.isSafeInteger(id) || id <= 0) return setError("Enter a valid positive WordPress post ID.");
    if (!categoryId) return setError("Please select a category.");
    const existing = findExistingImport(posts, { id, slug: "" });
    if (existing) return setError(`This post was already imported as “${existing.title}”.`);

    setBusy(true);
    try {
      const saved = await importWordPressPost({ postId: id, mode, categoryId, user, categories });
      toast.success(saved.status === "published" ? "WordPress article imported and published." : "WordPress article imported as a draft.");
      onImported();
      onOpenChange(false);
      const slug = categories.find((c) => c.id === categoryId)?.slug;
      router.push(slug ? `/posts/${slug}/${saved.id}` : `/posts/${saved.id}`);
    } catch (err) {
      console.error("WordPress import failed:", err);
      setError(err instanceof Error ? err.message : "Unable to import this WordPress article. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 pt-3">
      <div className="space-y-2">
        <Label htmlFor="wp-post-id">WordPress post ID</Label>
        <Input
          id="wp-post-id"
          type="number"
          min={1}
          step={1}
          placeholder="123"
          value={postId}
          onChange={(e) => setPostId(e.target.value)}
          disabled={busy}
        />
        <p className="text-xs text-muted-foreground">In WordPress, hover a post title — the ID shows in the link (post=123).</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wp-single-category">Save into category</Label>
        <Select value={categoryId} onValueChange={setCategoryId} disabled={busy}>
          <SelectTrigger id="wp-single-category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ModeSelect value={mode} onChange={setMode} disabled={busy} />
      <ErrorBox message={error} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" onClick={run} disabled={busy || !postId.trim() || !categoryId}>
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
          {busy ? "Importing…" : "Import article"}
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ------------------------------------------------------------------ whole category */

function CategoryImport({ categories, posts, defaultCategoryId, createCategory, onImported, onOpenChange, busy, setBusy }: PaneProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [wpCategories, setWpCategories] = useState<WordPressCategory[] | null>(null);
  const [listError, setListError] = useState("");
  const [wpCategoryId, setWpCategoryId] = useState("");
  // Default: the CMS category with the same name as the WordPress one (created if missing).
  const [target, setTarget] = useState(AUTO_CATEGORY);
  const [mode, setMode] = useState<ImportMode>("full");

  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loaded, setLoaded] = useState<WordPressCategory | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState<{ done: number; failed: number; skipped: number; slug?: string } | null>(null);
  const cancelRef = useRef(false);

  // WordPress categories for the dropdown (names + post counts).
  useEffect(() => {
    fetchWordPressCategories()
      .then(setWpCategories)
      .catch((err) => {
        setWpCategories([]);
        setListError(err instanceof Error ? err.message : "Could not load WordPress categories.");
      });
  }, []);

  const wpId = /^\d+$/.test(wpCategoryId.trim()) ? Number(wpCategoryId.trim()) : null;
  const known = wpCategories?.find((c) => c.id === wpId);

  async function loadPosts(id = wpId) {
    if (!id) return setError("Enter or choose a WordPress category.");
    setError("");
    setFinished(null);
    setLoadingPosts(true);
    try {
      const data = await fetchWordPressCategoryPosts(id);
      setLoaded(data.category);
      setRows(
        data.posts.map((p) => {
          const existing = findExistingImport(posts, p);
          return { ...p, existing, selected: !existing, state: existing ? "skipped" : "pending" };
        })
      );
    } catch (err) {
      setLoaded(null);
      setRows([]);
      setError(err instanceof Error ? err.message : "Could not load posts from WordPress.");
    } finally {
      setLoadingPosts(false);
    }
  }

  const selected = rows.filter((r) => r.selected && !r.existing);
  const progress = rows.filter((r) => r.selected && !r.existing && r.state !== "pending" && r.state !== "importing").length;
  const current = rows.find((r) => r.state === "importing");

  /** Find or create the CMS category the posts go into. */
  async function resolveTarget(): Promise<{ id: string; slug: string; list: Category[] }> {
    if (target !== AUTO_CATEGORY) {
      const c = categories.find((x) => x.id === target);
      return { id: target, slug: c?.slug ?? "", list: categories };
    }
    if (!loaded) throw new Error("Load a WordPress category first.");
    const same = categories.find((c) => c.slug === loaded.slug);
    if (same) return { id: same.id, slug: same.slug, list: categories };
    const id = await createCategory({ name: loaded.name, slug: loaded.slug, description: "", parentId: null });
    toast.success(`Category “${loaded.name}” created`);
    // savePost needs the new category to fill in its slug.
    const created = { id, name: loaded.name, slug: loaded.slug, description: "", parentId: null, image: null, createdAt: null, updatedAt: null } as Category;
    return { id, slug: loaded.slug, list: [...categories, created] };
  }

  async function runImport() {
    if (!user) return setError("You must be signed in to import.");
    if (!selected.length) return setError("Nothing to import — every post is already imported or unticked.");
    setError("");
    setBusy(true);
    cancelRef.current = false;
    let done = 0;
    let failed = 0;
    let destination: Awaited<ReturnType<typeof resolveTarget>>;
    try {
      destination = await resolveTarget();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare the category.");
      setBusy(false);
      return;
    }

    for (const row of selected) {
      if (cancelRef.current) break;
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, state: "importing" } : r)));
      try {
        await importWordPressPost({ postId: row.id, mode, categoryId: destination.id, user, categories: destination.list });
        done++;
        setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, state: "done" } : r)));
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : "Import failed";
        setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, state: "failed", error: message } : r)));
      }
    }

    setBusy(false);
    setFinished({ done, failed, skipped: rows.length - selected.length, slug: destination.slug });
    if (done) {
      onImported();
      toast.success(`${done} post${done === 1 ? "" : "s"} imported${failed ? `, ${failed} failed` : ""}`);
    } else if (failed) {
      toast.error("No posts could be imported.");
    }
  }

  const allSelectable = rows.filter((r) => !r.existing);
  const allTicked = allSelectable.length > 0 && allSelectable.every((r) => r.selected);

  return (
    <div className="space-y-5 pt-3">
      {/* Step 1: which WordPress category */}
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="wp-category">WordPress category</Label>
          <Select
            value={known ? String(known.id) : ""}
            onValueChange={(v) => {
              setWpCategoryId(v);
              void loadPosts(Number(v));
            }}
            disabled={busy || !wpCategories?.length}
          >
            <SelectTrigger id="wp-category">
              <SelectValue placeholder={wpCategories === null ? "Loading categories…" : wpCategories.length ? "Choose a category" : "Type the ID instead →"} />
            </SelectTrigger>
            <SelectContent>
              {wpCategories?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name} <span className="text-xs text-muted-foreground">· {c.count} posts · ID {c.id}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wp-category-id">or ID</Label>
          <Input
            id="wp-category-id"
            inputMode="numeric"
            placeholder="99"
            value={wpCategoryId}
            onChange={(e) => setWpCategoryId(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && loadPosts()}
            disabled={busy}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => loadPosts()} disabled={busy || loadingPosts || !wpId}>
          {loadingPosts ? <Loader2 className="animate-spin" /> : <Search />} Find posts
        </Button>
      </div>
      {listError && <p className="text-xs text-muted-foreground">{listError} You can still type a category ID.</p>}

      {/* Step 2: review the posts */}
      {loaded && (
        <div className="rounded-lg border">
          <div className="flex items-center justify-between gap-3 border-b px-3 py-2 text-sm">
            <label className="flex items-center gap-2 font-medium">
              <Checkbox
                checked={allTicked}
                disabled={busy || !allSelectable.length}
                onCheckedChange={(on) => setRows((rs) => rs.map((r) => (r.existing ? r : { ...r, selected: Boolean(on) })))}
              />
              {loaded.name}
            </label>
            <span className="text-xs text-muted-foreground">
              {rows.length} posts · {selected.length} to import
              {rows.length - allSelectable.length > 0 && ` · ${rows.length - allSelectable.length} already imported`}
            </span>
          </div>
          <ul className="max-h-64 divide-y overflow-y-auto text-sm">
            {rows.length === 0 && <li className="px-3 py-6 text-center text-muted-foreground">No published posts in this category.</li>}
            {rows.map((r) => (
              <li key={r.id} className={cn("flex items-center gap-2.5 px-3 py-2", r.existing && "text-muted-foreground")}>
                <Checkbox
                  checked={r.selected && !r.existing}
                  disabled={busy || Boolean(r.existing)}
                  onCheckedChange={(on) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, selected: Boolean(on) } : x)))}
                  aria-label={`Import ${r.title}`}
                />
                <span className="min-w-0 flex-1 truncate" title={r.error || r.title}>
                  {r.title}
                </span>
                <RowStatus row={r} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Step 3: where + how */}
      {loaded && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wp-target">Save into category</Label>
            <Select value={target} onValueChange={setTarget} disabled={busy}>
              <SelectTrigger id="wp-target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO_CATEGORY}>
                  {categories.some((c) => c.slug === loaded.slug) ? `“${loaded.name}” (same as WordPress)` : `New category “${loaded.name}”`}
                </SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ModeSelect value={mode} onChange={setMode} disabled={busy} />
        </div>
      )}

      {busy && (
        <div className="space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${(progress / Math.max(1, selected.length)) * 100}%` }} />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            Importing {Math.min(progress + 1, selected.length)} of {selected.length}
            {current ? ` — ${current.title}` : ""}. Keep this window open.
          </p>
        </div>
      )}

      {finished && (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <b>{finished.done}</b> imported
          {finished.failed > 0 && (
            <>
              , <b className="text-destructive">{finished.failed}</b> failed (hover a row to see why)
            </>
          )}
          {finished.skipped > 0 && <>, {finished.skipped} skipped</>}.
        </div>
      )}

      <ErrorBox message={error} />

      <DialogFooter>
        {busy ? (
          <Button type="button" variant="outline" onClick={() => (cancelRef.current = true)}>
            Stop after this post
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {finished ? "Close" : "Cancel"}
          </Button>
        )}
        {finished?.done && finished.slug ? (
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              router.push(`/posts/${finished.slug}`);
            }}
          >
            View {loaded?.name ?? "posts"}
          </Button>
        ) : (
          <Button type="button" onClick={runImport} disabled={busy || !loaded || selected.length === 0}>
            {busy ? <Loader2 className="animate-spin" /> : <Download />}
            {busy ? "Importing…" : `Import ${selected.length} post${selected.length === 1 ? "" : "s"}`}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

function RowStatus({ row }: { row: Row }) {
  if (row.existing) return <span className="shrink-0 text-xs">Already imported</span>;
  switch (row.state) {
    case "importing":
      return <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />;
    case "done":
      return <CheckCircle2 className="size-4 shrink-0" aria-label="Imported" />;
    case "failed":
      return (
        <span className="flex shrink-0 items-center gap-1 text-xs text-destructive" title={row.error}>
          <XCircle className="size-4" /> Failed
        </span>
      );
    default:
      return row.selected ? null : <CircleSlash className="size-4 shrink-0 text-muted-foreground" aria-label="Skipped" />;
  }
}

