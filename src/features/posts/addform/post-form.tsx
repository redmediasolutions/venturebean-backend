"use client";

/**
 * The "Add New Post" / "Edit Post" screen — laid out like WordPress:
 * writing area on the left, Publish / Categories / Featured image on the right.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { slugify } from "@/lib/slugify";
import { formatDate, getErrorMessage, toDateTimeLocal } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/forms/form-field";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { CategoryChecklist } from "@/features/categories/components/category-checklist";
import { useFieldGroups } from "@/features/custom-fields/hooks/use-field-groups";
import { groupsForPost } from "@/features/custom-fields/services/field-group-service";
import { CustomFieldsPanel } from "@/features/custom-fields/components/custom-fields-panel";
import { ImageInput } from "@/features/media/components/media-inputs";
import { buildPostUrl, useSiteSettings } from "@/features/settings/hooks/use-site-settings";
import { savePost, validateCustomFields } from "../services/post-service";
import { deletePost } from "../repository/post-repository";
import { PostStatusBadge } from "../lib/post-status";
import type { Post, PostInput, PostStatus } from "../types";

interface PostFormProps {
  post?: Post;
  /** Pre-select a category when creating (from ?category=…). */
  defaultCategoryId?: string;
}

export function PostForm({ post, defaultCategoryId }: PostFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { categories, tree, loading: categoriesLoading } = useCategories();
  const { groups } = useFieldGroups();
  const { settings } = useSiteSettings();

  const [values, setValues] = useState<PostInput>(() => ({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    content: post?.content ?? "",
    excerpt: post?.excerpt ?? "",
    featuredImage: post?.featuredImage ?? null,
    categoryIds: post?.categoryIds ?? (defaultCategoryId ? [defaultCategoryId] : []),
    status: post?.status ?? "draft",
    publishedAt: post?.publishedAt ?? null,
    seoTitle: post?.seoTitle ?? "",
    seoDescription: post?.seoDescription ?? "",
    customFields: post?.customFields ?? {},
    authorId: post?.authorId ?? user?.uid ?? "",
    authorName: post?.authorName ?? (user?.displayName || user?.email || ""),
  }));
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [savingAs, setSavingAs] = useState<PostStatus | null>(null);
  const [dirty, setDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedStatus, setSavedStatus] = useState<PostStatus | null>(post?.status ?? null);
  useUnsavedChanges(dirty);

  const set = (patch: Partial<PostInput>) => {
    setValues((v) => ({ ...v, ...patch }));
    setDirty(true);
  };

  const visibleGroups = useMemo(() => groupsForPost(groups, values.categoryIds), [groups, values.categoryIds]);
  const isPublished = savedStatus === "published";
  const liveUrl = post && isPublished && values.slug ? buildPostUrl(settings, values.slug) : null;

  async function save(status: PostStatus) {
    const input = { ...values, status };
    if (status === "published") {
      const errors = validateCustomFields(input, groups);
      setFieldErrors(errors);
      if (Object.keys(errors).length) {
        toast.error("Please fill in the required fields before publishing.");
        return;
      }
    }
    setSavingAs(status);
    try {
      const result = await savePost(input, categories, post?.id);
      setValues((v) => ({ ...v, status, slug: result.slug, publishedAt: input.publishedAt ?? (status === "published" ? new Date() : null) }));
      setSlugTouched(true);
      setSavedStatus(status);
      setDirty(false);
      toast.success(
        status === "published" ? (isPublished ? "Post updated" : "Post published") : isPublished ? "Post moved to drafts" : "Draft saved"
      );
      if (!post) router.replace(`/posts/${result.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingAs(null);
    }
  }

  const busy = savingAs !== null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* ================= Main column ================= */}
      <div className="min-w-0 space-y-6">
        <div className="space-y-2">
          <Input
            value={values.title}
            onChange={(e) => {
              const title = e.target.value;
              set({ title, ...(slugTouched ? {} : { slug: slugify(title) }) });
            }}
            placeholder="Add title"
            aria-label="Title"
            className="h-12 border-0 px-0 text-3xl font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-3xl dark:bg-transparent"
          />
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <span>Slug:</span>
            <span className="font-mono text-xs">{(settings.postUrlPattern || "/blog/{slug}").split("{slug}")[0]}</span>
            <Input
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") });
              }}
              onBlur={() => set({ slug: slugify(values.slug) })}
              placeholder="post-url"
              aria-label="Slug"
              className="h-7 w-auto min-w-[12rem] flex-1 font-mono text-xs sm:max-w-sm"
            />
          </div>
        </div>

        <RichTextEditor value={values.content} onChange={(content) => set({ content })} placeholder="Start writing your post…" />

        <Card>
          <CardHeader>
            <CardTitle>Excerpt</CardTitle>
            <CardDescription>A short summary shown on blog listing pages. Optional.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea rows={3} value={values.excerpt} onChange={(e) => set({ excerpt: e.target.value })} />
          </CardContent>
        </Card>

        <CustomFieldsPanel
          groups={visibleGroups}
          values={values.customFields}
          errors={fieldErrors}
          onChange={(name, value) => {
            set({ customFields: { ...values.customFields, [name]: value } });
            if (fieldErrors[name]) setFieldErrors(({ [name]: _, ...rest }) => rest);
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
            <CardDescription>How this post appears on Google. Leave empty to use the title and excerpt.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField label="SEO title" help={`${values.seoTitle.length}/60 characters recommended`}>
              <Input value={values.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} placeholder={values.title} />
            </FormField>
            <FormField label="Meta description" help={`${values.seoDescription.length}/160 characters recommended`}>
              <Textarea
                rows={2}
                value={values.seoDescription}
                onChange={(e) => set({ seoDescription: e.target.value })}
                placeholder={values.excerpt}
              />
            </FormField>
          </CardContent>
        </Card>
      </div>

      {/* ================= Right sidebar ================= */}
      <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Publish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              {savedStatus ? (
                <PostStatusBadge post={{ status: savedStatus, publishedAt: values.publishedAt }} />
              ) : (
                <span className="font-medium">Not saved yet</span>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="publish-date" className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarClock className="size-3.5" /> Publish date
              </label>
              <Input
                id="publish-date"
                type="datetime-local"
                value={toDateTimeLocal(values.publishedAt)}
                onChange={(e) => set({ publishedAt: e.target.value ? new Date(e.target.value) : null })}
                className="h-8 text-xs"
              />
              <p className="text-xs text-muted-foreground">Leave empty to publish immediately. Pick a future date to schedule.</p>
            </div>
            {post && (
              <p className="text-xs text-muted-foreground">
                Last saved {formatDate(post.updatedAt, true)}
                {post.authorName && <> · by {post.authorName}</>}
              </p>
            )}
            <Separator />
            <div className="flex flex-col gap-2">
              <Button onClick={() => save("published")} disabled={busy}>
                {savingAs === "published" && <Loader2 className="animate-spin" />}
                {isPublished ? "Update" : values.publishedAt && values.publishedAt > new Date() ? "Schedule" : "Publish"}
              </Button>
              <Button variant="outline" onClick={() => save("draft")} disabled={busy}>
                {savingAs === "draft" && <Loader2 className="animate-spin" />}
                {isPublished ? "Switch to draft" : "Save draft"}
              </Button>
              {liveUrl && (
                <Button variant="ghost" asChild>
                  <a href={liveUrl} target="_blank" rel="noreferrer">
                    <ExternalLink /> View on website
                  </a>
                </Button>
              )}
            </div>
            {dirty && <p className="text-center text-xs text-muted-foreground">You have unsaved changes</p>}
            {post && (
              <>
                <Separator />
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
                >
                  <Trash2 className="size-3.5" /> Delete post
                </button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CategoryChecklist
              tree={tree}
              loading={categoriesLoading}
              value={values.categoryIds}
              onChange={(categoryIds) => set({ categoryIds })}
            />
            <Link href="/categories" className="block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              + Manage categories
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Featured image</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageInput value={values.featuredImage} onChange={(featuredImage) => set({ featuredImage })} showAlt />
          </CardContent>
        </Card>
      </div>

      {post && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this post permanently?"
          description="It will be removed from your website. This cannot be undone."
          onConfirm={async () => {
            try {
              await deletePost(post.id);
              setDirty(false);
              toast.success("Post deleted");
              router.replace("/posts");
            } catch (err) {
              toast.error(getErrorMessage(err));
            }
          }}
        />
      )}
    </div>
  );
}
