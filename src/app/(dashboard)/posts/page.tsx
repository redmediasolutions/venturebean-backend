"use client";

import { Suspense, useState } from "react";

import Link from "next/link";

import { useSearchParams, useRouter } from "next/navigation";

import {

  Plus,

  FolderPlus,

  Loader2,

  Globe,

  Download,

} from "lucide-react";

import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";

import { Button } from "@/components/ui/button";

import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogFooter,

  DialogHeader,

  DialogTitle,

} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import { usePosts } from "@/features/posts/hooks/use-posts";

import { PostsTable } from "@/features/posts/components/posts-table";

import { useCategories } from "@/features/categories/hooks/use-categories";

import { useSiteSettings } from "@/features/settings/hooks/use-site-settings";

import { savePost } from "@/features/posts/services/post-service";

import type { PostInput } from "@/features/posts/types";

import { useAuth } from "@/components/providers/auth-provider";

interface CategoryFormData {

  name: string;

  slug: string;

  description: string;

  order: number;

}

type ImportMode = "full" | "summary";

interface WordPressImportResponse {
  success: boolean;
  post: {
    id: number;
    title: string;
    slug: string;
    url: string;
    excerpt: string;
    contentHtml: string;
    featuredImage: string | null;

    createdAt: string | null;
    publishedAt: string | null;
    updatedAt: string | null;

    status: string;
  };
}

function slugify(value: string): string {

  return value

    .toLowerCase()

    .trim()

    .normalize("NFKD")

    .replace(/[\u0300-\u036f]/g, "")

    .replace(/[^a-z0-9]+/g, "-")

    .replace(/^-+|-+$/g, "");

}

async function readErrorResponse(response: Response): Promise<string> {

  try {

    const data = (await response.json()) as {

      error?: string;

      message?: string;

    };

    return (

      data.error ||

      data.message ||

      `Request failed with status ${response.status}.`

    );

  } catch {

    return `Request failed with status ${response.status}.`;

  }

}

function PostsPageContent() {

  const params = useSearchParams();

  const router = useRouter();

  const { posts, loading } = usePosts();

type PostsTablePosts = React.ComponentProps<typeof PostsTable>["posts"];

const typedPosts = posts as PostsTablePosts;

  const {

    categories,

    tree,

    byId,

    createCategory,

  } = useCategories();

  const { settings } = useSiteSettings();

  const { user } = useAuth();

  const initialCategory = params.get("category") ?? undefined;

  // Create-category dialog.

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const [savingCategory, setSavingCategory] = useState(false);

  const [categoryError, setCategoryError] = useState("");

  const [categorySuccess, setCategorySuccess] = useState("");

  const [form, setForm] = useState<CategoryFormData>({

    name: "",

    slug: "",

    description: "",

    order: categories.length + 1,

  });

  // WordPress import dialog.

  const [wordpressDialogOpen, setWordPressDialogOpen] = useState(false);

  const [wordpressPostId, setWordPressPostId] = useState("");

  const [wordpressCategoryId, setWordPressCategoryId] = useState(

    initialCategory ?? "",

  );

  const [wordpressMode, setWordPressMode] =

    useState<ImportMode>("full");

  const [importingWordPress, setImportingWordPress] = useState(false);

  const [wordpressError, setWordPressError] = useState("");

  function updateField<K extends keyof CategoryFormData>(

    field: K,

    value: CategoryFormData[K],

  ) {

    setForm((current) => ({

      ...current,

      [field]: value,

    }));

  }

  function openCategoryDialog() {

    setCategoryError("");

    setCategorySuccess("");

    setForm({

      name: "",

      slug: "",

      description: "",

      order: categories.length + 1,

    });

    setCategoryDialogOpen(true);

  }

  async function handleCreateCategory(

    event: React.FormEvent<HTMLFormElement>,

  ) {

    event.preventDefault();

    setCategoryError("");

    setCategorySuccess("");

    const name = form.name.trim();

    const slug = slugify(form.slug || name);

    if (!name) {

      setCategoryError("Please enter a category name.");

      return;

    }

    if (!slug) {

      setCategoryError("Please enter a valid category name or slug.");

      return;

    }

    const duplicate = categories.some(

      (category) =>

        category.slug?.toLowerCase() === slug.toLowerCase(),

    );

    if (duplicate) {

      setCategoryError(

        "A category with this slug already exists. Please choose another slug.",

      );

      return;

    }

    if (!Number.isInteger(form.order) || form.order < 1) {

      setCategoryError(

        "Display order must be a positive whole number.",

      );

      return;

    }

    setSavingCategory(true);

    try {

      await createCategory({

        name,

        slug,

        description: form.description.trim(),

        parentId: null,

      });

      setCategorySuccess(

        `Category "${name}" created successfully.`,

      );

      setCategoryDialogOpen(false);

    } catch (error) {

      console.error("Failed to create category:", error);

      setCategoryError(

        error instanceof Error

          ? error.message

          : "Unable to create the category. Please try again.",

      );

    } finally {

      setSavingCategory(false);

    }

  }

  function openWordPressDialog() {

    setWordPressError("");

    setWordPressPostId("");

    setWordPressCategoryId(initialCategory ?? "");

    setWordPressMode("full");

    setWordPressDialogOpen(true);

  }

  async function handleWordPressImport() {

  setWordPressError("");

  // ============================================================

  // VALIDATE AUTHENTICATION

  // ============================================================

  if (!user) {

    setWordPressError(

      "You must be signed in to import a WordPress article.",

    );

    return;

  }

  // ============================================================

  // VALIDATE WORDPRESS POST ID

  // ============================================================

  const rawPostId = wordpressPostId.trim();

  const postId = Number(rawPostId);

  if (

    !rawPostId ||

    !Number.isSafeInteger(postId) ||

    postId <= 0

  ) {

    setWordPressError(

      "Enter a valid positive WordPress post ID.",

    );

    return;

  }

  // ============================================================

  // VALIDATE CATEGORY

  // ============================================================

  if (!wordpressCategoryId) {

    setWordPressError("Please select a category.");

    return;

  }

  setImportingWordPress(true);

  try {

    // ============================================================
    // CALL WORDPRESS IMPORT API USING THE HTTP-ONLY SESSION COOKIE
    // ============================================================

    const response = await fetch("/api/wordpress/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        postId,
        mode: wordpressMode,
      }),
      cache: "no-store",
    });

// Read the response body as text first so we can inspect

// responses that aren't valid JSON.

const responseText = await response.text();

let result: any = null;

try {

  result = responseText ? JSON.parse(responseText) : null;

} catch {

  console.error("Import API returned a non-JSON response:", {

    status: response.status,

    statusText: response.statusText,

    body: responseText.slice(0, 2000),

  });

}

if (!response.ok) {

  console.error("WordPress import API diagnostic:", {

    status: response.status,

    statusText: response.statusText,

    responseBody: responseText,

    url: response.url,

  });

  let errorMessage = "Failed to import WordPress post.";

  try {

    const errorData = JSON.parse(responseText);

    errorMessage =

      errorData.error ||

      errorData.message ||

      errorMessage;

  } catch {

    if (responseText) {

      errorMessage = responseText;

    }

  }

  throw new Error(

    `WordPress import failed (${response.status}): ${errorMessage}`,

  );

}

if (!result?.success || !result?.post) {

  throw new Error(

    result?.details ||

      result?.error ||

      "The WordPress import did not return an article.",

  );

}

const imported = result.post;

    // ============================================================

    // VALIDATE IMPORTED ARTICLE

    // ============================================================

    if (!imported.title?.trim()) {

      throw new Error(

        "The imported WordPress article does not have a title.",

      );

    }

    if (!imported.contentHtml?.trim()) {

      throw new Error(

        "The imported article does not contain any content.",

      );

    }

    // ============================================================

    // PREPARE FEATURED IMAGE

    // ============================================================

    const featuredImage = imported.featuredImage

      ? ({

          url: imported.featuredImage,

          alt: imported.title.trim(),

        } as NonNullable<PostInput["featuredImage"]>)

      : null;

    const importedStatus: PostInput["status"] =
  imported.status === "publish" ? "published" : "draft";

const importedCreatedAt = imported.createdAt
  ? new Date(imported.createdAt)
  : null;

const importedPublishedAt =
  importedStatus === "published" && imported.publishedAt
    ? new Date(imported.publishedAt)
    : null;

const importedUpdatedAt = imported.updatedAt
  ? new Date(imported.updatedAt)
  : null;

    // ============================================================

    // BUILD POST INPUT

    // ============================================================

    const postInput: PostInput = {
  title: imported.title.trim(),

  slug: slugify(imported.slug || imported.title),

  content: imported.contentHtml,

  excerpt: imported.excerpt?.trim() ?? "",

  featuredImage,

  categoryIds: [wordpressCategoryId],

  // Preserve the original WordPress status.
  status: importedStatus,

  // Preserve the original publication date.
  publishedAt: importedPublishedAt,

  seoTitle: imported.title.trim(),

  seoDescription: imported.excerpt?.trim() ?? "",

  customFields: {},

  authorId: user.uid,

  authorName:
    user.displayName ||
    user.email ||
    "VentureBean Admin",

  // These two fields require the PostInput type and savePost()
  // service to support importing original timestamps.
  createdAt: importedCreatedAt,
  updatedAt: importedUpdatedAt,
};

    // ============================================================

    // SAVE DRAFT

    // ============================================================

    const saved = await savePost(

      postInput,

      categories,

    );

    // ============================================================

    // SUCCESS

    // ============================================================

    setWordPressDialogOpen(false);

    setWordPressPostId("");

    setWordPressError("");

    toast.success(
  importedStatus === "published"
    ? "WordPress article imported and published."
    : "WordPress article imported as a draft.",
);

    router.push(`/posts/${saved.id}`);

  } catch (error) {

    console.error("WordPress import failed:", error);

    setWordPressError(

      error instanceof Error

        ? error.message

        : "Unable to import this WordPress article. Please try again.",

    );

  } finally {

    setImportingWordPress(false);

  }

}

  return (

    <>

      <PageHeader

        title="Posts"

        description="All your blog posts, news and other content. Use categories to keep them separate."

        actions={

          <div className="flex flex-wrap items-center gap-2">

            <Button

              variant="outline"

              onClick={openCategoryDialog}

            >

              <FolderPlus className="mr-2 h-4 w-4" />

              Create category

            </Button>

            <Button

              variant="outline"

              onClick={openWordPressDialog}

            >

              <Globe className="mr-2 h-4 w-4" />

              Import from WordPress

            </Button>

            <Button asChild>

              <Link

                href={

                  initialCategory

                    ? `/posts/new?category=${encodeURIComponent(initialCategory)}`

                    : "/posts/new"

                }

              >

                <Plus className="mr-2 h-4 w-4" />

                New post

              </Link>

            </Button>

          </div>

        }

      />

      {categorySuccess && (

        <div

          role="status"

          className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"

        >

          {categorySuccess}

        </div>

      )}

      <PostsTable
  key={initialCategory ?? "all"}
  posts={typedPosts}
  loading={loading}
  categories={categories}
  tree={tree}
  categoriesById={byId}
  settings={settings}
  initialCategory={initialCategory}
/>

      {/* CREATE CATEGORY DIALOG */}

      <Dialog

        open={categoryDialogOpen}

        onOpenChange={(open) => {

          if (!savingCategory) {

            setCategoryDialogOpen(open);

            if (!open) {

              setCategoryError("");

            }

          }

        }}

      >

        <DialogContent className="sm:max-w-lg">

          <form onSubmit={handleCreateCategory}>

            <DialogHeader>

              <DialogTitle>Create category</DialogTitle>

              <DialogDescription>

                Create a category to organize VentureBean articles.

                You can assign articles to it when creating or editing posts.

              </DialogDescription>

            </DialogHeader>

            <div className="mt-6 space-y-5">

              <div className="space-y-2">

                <Label htmlFor="category-name">

                  Category name

                </Label>

                <Input

                  id="category-name"

                  placeholder="Leadership & Executive Coaching"

                  value={form.name}

                  onChange={(event) => {

                    const name = event.target.value;

                    setForm((current) => ({

                      ...current,

                      name,

                      slug: slugify(name),

                    }));

                  }}

                  disabled={savingCategory}

                  required

                />

              </div>

              <div className="space-y-2">

                <Label htmlFor="category-slug">

                  URL slug

                </Label>

                <Input

                  id="category-slug"

                  placeholder="leadership-coaching"

                  value={form.slug}

                  onChange={(event) =>

                    updateField("slug", slugify(event.target.value))

                  }

                  disabled={savingCategory}

                  required

                />

                <p className="text-xs text-muted-foreground">

                  Category URL: /category/

                  {form.slug || "category-slug"}

                </p>

              </div>

              <div className="space-y-2">

                <Label htmlFor="category-description">

                  Description

                </Label>

                <Textarea

                  id="category-description"

                  placeholder="Describe the articles that belong in this category."

                  value={form.description}

                  onChange={(event) =>

                    updateField("description", event.target.value)

                  }

                  disabled={savingCategory}

                  rows={4}

                />

              </div>

              <div className="space-y-2">

                <Label htmlFor="category-order">

                  Display order

                </Label>

                <Input

                  id="category-order"

                  type="number"

                  min={1}

                  step={1}

                  value={form.order}

                  onChange={(event) =>

                    updateField("order", Number(event.target.value))

                  }

                  disabled={savingCategory}

                  required

                />

                <p className="text-xs text-muted-foreground">

                  Determines the order in which categories are displayed.

                </p>

              </div>

              {categoryError && (

                <p role="alert" className="text-sm text-destructive">

                  {categoryError}

                </p>

              )}

            </div>

            <DialogFooter className="mt-6">

              <Button

                type="button"

                variant="outline"

                onClick={() => setCategoryDialogOpen(false)}

                disabled={savingCategory}

              >

                Cancel

              </Button>

              <Button type="submit" disabled={savingCategory}>

                {savingCategory ? (

                  <>

                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                    Creating...

                  </>

                ) : (

                  <>

                    <FolderPlus className="mr-2 h-4 w-4" />

                    Create category

                  </>

                )}

              </Button>

            </DialogFooter>

          </form>

        </DialogContent>

      </Dialog>

      {/* IMPORT FROM WORDPRESS DIALOG */}

      <Dialog

        open={wordpressDialogOpen}

        onOpenChange={(open) => {

          if (!importingWordPress) {

            setWordPressDialogOpen(open);

            if (!open) {

              setWordPressError("");

            }

          }

        }}

      >

        <DialogContent className="sm:max-w-lg">

          <DialogHeader>

            <DialogTitle>Import from WordPress</DialogTitle>

            <DialogDescription>

              Import a published VentureBean article. Its images will

              be copied to S3 and the article will be saved as a draft.

            </DialogDescription>

          </DialogHeader>

          <div className="mt-6 space-y-5">

            <div className="space-y-2">

              <Label htmlFor="wordpress-post-id">WordPress Post ID</Label>

              <Input

                id="wordpress-post-id"

                type="number"

                min={1}

                step={1}

                placeholder="123"

                value={wordpressPostId}

                onChange={(event) =>

                  setWordPressPostId(event.target.value)

                }

                disabled={importingWordPress}

                required

              />

              <p className="text-xs text-muted-foreground">

                Enter the numeric ID of a published VentureBean WordPress post.

              </p>

            </div>

            <div className="space-y-2">

              <Label htmlFor="wordpress-category">

                Category

              </Label>

              <Select

                value={wordpressCategoryId}

                onValueChange={setWordPressCategoryId}

                disabled={importingWordPress}

              >

                <SelectTrigger id="wordpress-category">

                  <SelectValue placeholder="Select a category" />

                </SelectTrigger>

                <SelectContent>

                  {categories.map((category) => (

                    <SelectItem

                      key={category.id}

                      value={category.id}

                    >

                      {category.name}

                    </SelectItem>

                  ))}

                </SelectContent>

              </Select>

              <p className="text-xs text-muted-foreground">

                Select the category for the imported post.

              </p>

            </div>

            <div className="space-y-2">

              <Label htmlFor="wordpress-mode">

                Content to import

              </Label>

              <Select

                value={wordpressMode}

                onValueChange={(value) =>

                  setWordPressMode(value as ImportMode)

                }

                disabled={importingWordPress}

              >

                <SelectTrigger id="wordpress-mode">

                  <SelectValue />

                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="full">

                    Full article

                  </SelectItem>

                  <SelectItem value="summary">

                    Summary only

                  </SelectItem>

                </SelectContent>

              </Select>

              <p className="text-xs text-muted-foreground">

                {wordpressMode === "full"

                  ? "Import the complete article, including HTML formatting and images."

                  : "Import only the WordPress excerpt."}

              </p>

            </div>

            {wordpressError && (

              <div

                role="alert"

                className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"

              >

                {wordpressError}

              </div>

            )}

          </div>

          <DialogFooter className="mt-6">

            <Button

              type="button"

              variant="outline"

              onClick={() => setWordPressDialogOpen(false)}

              disabled={importingWordPress}

            >

              Cancel

            </Button>

            <Button

              type="button"

              onClick={handleWordPressImport}

              disabled={

                importingWordPress ||

                !wordpressPostId.trim() ||

                !wordpressCategoryId

              }

            >

              {importingWordPress ? (

                <>

                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                  Importing...

                </>

              ) : (

                <>

                  <Download className="mr-2 h-4 w-4" />

                  Import article

                </>

              )}

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </>

  );

}

export default function PostsPage() {

  return (

    <Suspense>

      <PostsPageContent />

    </Suspense>

  );

}
