"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { PostForm } from "@/features/posts/addform/post-form";
import { postsPath } from "@/features/posts/lib/post-paths";

/** /posts/coaching/new — new post, already ticked in Coaching. */
export default function NewPostInCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const slug = decodeURIComponent(category);
  const { categories, loading } = useCategories();
  const current = categories.find((c) => c.slug === slug);

  return (
    <>
      <Link href={postsPath(slug)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {current?.name ?? "All posts"}
      </Link>
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <PostForm defaultCategoryId={current?.id} basePath={postsPath(current?.slug)} />
      )}
    </>
  );
}
