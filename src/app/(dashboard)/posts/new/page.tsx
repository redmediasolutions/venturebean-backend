"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PostForm } from "@/features/posts/addform/post-form";

function NewPostContent() {
  const params = useSearchParams();
  return (
    <>
      <Link href="/posts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All posts
      </Link>
      <PostForm defaultCategoryId={params.get("category") ?? undefined} />
    </>
  );
}

export default function NewPostPage() {
  return (
    <Suspense>
      <NewPostContent />
    </Suspense>
  );
}
