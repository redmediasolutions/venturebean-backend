"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileX, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { usePost } from "@/features/posts/hooks/use-posts";
import { PostForm } from "@/features/posts/addform/post-form";

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { post, loading, error } = usePost(id);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/posts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All posts
        </Link>

        {post && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/posts/new">Add new</Link>
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
              <Link href="/posts">Back to posts</Link>
            </Button>
          }
        />
      ) : (
        <PostForm key={post.id} post={post} />
      )}
    </>
  );
}