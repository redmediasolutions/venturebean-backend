"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { PostsScreen } from "@/features/posts/components/posts-screen";
import { EditPostScreen } from "@/features/posts/components/edit-post-screen";

/**
 * /posts/coaching  → posts in the "coaching" category.
 * /posts/<postId>  → older links to a post still open its editor.
 */
export default function PostsCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const slug = decodeURIComponent(category);
  const { categories, loading } = useCategories();

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (categories.some((c) => c.slug === slug)) return <PostsScreen categorySlug={slug} />;
  return <EditPostScreen id={slug} />;
}
