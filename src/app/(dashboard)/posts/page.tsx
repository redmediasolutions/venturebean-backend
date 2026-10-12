"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { usePosts } from "@/features/posts/hooks/use-posts";
import { PostsTable } from "@/features/posts/components/posts-table";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useSiteSettings } from "@/features/settings/hooks/use-site-settings";

function PostsPageContent() {
  const params = useSearchParams();
  const { posts, loading } = usePosts();
  const { categories, tree, byId } = useCategories();
  const { settings } = useSiteSettings();
  const initialCategory = params.get("category") ?? undefined;

  return (
    <>
      <PageHeader
        title="Posts"
        description="All your blog posts, news and other content. Use categories to keep them separate."
        actions={
          <Button asChild>
            <Link href={initialCategory ? `/posts/new?category=${initialCategory}` : "/posts/new"}>
              <Plus /> New post
            </Link>
          </Button>
        }
      />
      <PostsTable
        key={initialCategory ?? "all"}
        posts={posts}
        loading={loading}
        categories={categories}
        tree={tree}
        categoriesById={byId}
        settings={settings}
        initialCategory={initialCategory}
      />
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
