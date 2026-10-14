"use client";

import Link from "next/link";
import { ArrowLeft, FileX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { usePost } from "../hooks/use-posts";
import { PostForm } from "../addform/post-form";
import { postsPath } from "../lib/post-paths";

/** Edit screen. `categorySlug` is the list the editor came from (for the back link). */
export function EditPostScreen({ id, categorySlug }: { id: string; categorySlug?: string }) {
  const { post, loading, error } = usePost(id);
  const { categories } = useCategories();
  const category = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;
  const base = postsPath(categorySlug);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Link href={base} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {category ? category.name : "All posts"}
        </Link>
        {post && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`${base}/new`}>Add new</Link>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error || !post ? (
        <EmptyState
          icon={FileX}
          title="Post not found"
          description={
            error
              ? "Unable to load this post. It may have been deleted, or you may need to sign in again."
              : "This post may have been deleted or the URL may be incorrect."
          }
          action={
            <Button asChild>
              <Link href={base}>Back to posts</Link>
            </Button>
          }
        />
      ) : (
        <PostForm key={post.id} post={post} basePath={base} />
      )}
    </>
  );
}
