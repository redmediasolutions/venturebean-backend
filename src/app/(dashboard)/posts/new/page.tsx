"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WordPressImportForm } from "@/features/posts/import/wordpress-import-form";

function NewPostContent() {
  const params = useSearchParams();
  const defaultCategoryId = params.get("category") ?? undefined;

  return (
    <div className="space-y-6">
      <Link
        href="/posts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All posts
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Import article
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Import an existing article from WordPress and preview its content
          before saving it.
        </p>
      </div>

      <WordPressImportForm
        defaultCategoryId={defaultCategoryId}
      />
    </div>
  );
}

export default function NewPostPage() {
  return (
    <Suspense>
      <NewPostContent />
    </Suspense>
  );
}