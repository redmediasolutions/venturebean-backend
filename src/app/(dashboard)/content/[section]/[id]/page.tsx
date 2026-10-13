"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { usePost } from "@/features/posts/hooks/use-posts";
import { PostForm } from "@/features/posts/addform/post-form";
import { SectionGate } from "@/features/sections/components/section-gate";

export default function EditSectionItemPage() {
  const { id } = useParams<{ id: string }>();
  const { post, loading, notFound } = usePost(id);

  return (
    <SectionGate>
      {(section, categoryId) => {
        const base = `/content/${section.slug}`;
        return (
          <>
            <div className="mb-4 flex items-center justify-between">
              <Link href={base} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" /> {section.name}
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
            ) : notFound || !post ? (
              <EmptyState
                icon={FileX}
                title="Not found"
                description="It may have been deleted."
                action={
                  <Button asChild>
                    <Link href={base}>Back to {section.name}</Link>
                  </Button>
                }
              />
            ) : (
              <PostForm key={post.id} post={post} lockedCategoryId={categoryId} basePath={base} itemLabel={section.itemLabel} />
            )}
          </>
        );
      }}
    </SectionGate>
  );
}
