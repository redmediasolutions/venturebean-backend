"use client";

/**
 * The Posts list. Used by:
 *   /posts             → all posts
 *   /posts/<category>  → one category, e.g. /posts/coaching
 * Choosing a category in the dropdown changes the URL, and the sidebar links
 * to the same URLs.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderPlus, Globe, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { CreateCategoryDialog } from "@/features/categories/addform/create-category-dialog";
import { useSiteSettings } from "@/features/settings/hooks/use-site-settings";
import { usePosts } from "../hooks/use-posts";
import { WordPressImportDialog } from "../import/wordpress-import-dialog";
import { postsPath } from "../lib/post-paths";
import { PostsTable } from "./posts-table";

export function PostsScreen({ categorySlug }: { categorySlug?: string }) {
  const router = useRouter();
  const { posts, loading, refreshPosts } = usePosts();
  const { categories, tree, byId, createCategory, loading: categoriesLoading } = useCategories();
  const { settings } = useSiteSettings();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const current = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;
  const base = postsPath(current?.slug);

  if (categorySlug && categoriesLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={current ? current.name : "Posts"}
        description={
          current
            ? current.description || `All posts in ${current.name}.`
            : "All your blog posts, news and other content. Use categories to keep them separate."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
              <FolderPlus /> Create category
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Globe /> Import from WordPress
            </Button>
            <Button asChild>
              <Link href={`${base}/new`}>
                <Plus /> New post
              </Link>
            </Button>
          </div>
        }
      />

      <PostsTable
        key={current?.id ?? "all"}
        posts={posts}
        loading={loading}
        categories={categories}
        tree={tree}
        categoriesById={byId}
        settings={settings}
        basePath={base}
        categoryValue={current?.id}
        onCategoryChange={(id) => router.push(postsPath(id ? byId.get(id)?.slug : undefined))}
      />

      <CreateCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        categories={categories}
        createCategory={createCategory}
        onCreated={(c) => {
          toast.success(`Category “${c.name}” created`);
          router.push(postsPath(c.slug));
        }}
      />

      <WordPressImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        categories={categories}
        posts={posts}
        defaultCategoryId={current?.id}
        createCategory={createCategory}
        onImported={() => void refreshPosts()}
      />
    </>
  );
}
