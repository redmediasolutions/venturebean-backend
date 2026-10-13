"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PostForm } from "@/features/posts/addform/post-form";
import { SectionGate } from "@/features/sections/components/section-gate";

export default function NewSectionItemPage() {
  return (
    <SectionGate>
      {(section, categoryId) => (
        <>
          <Link
            href={`/content/${section.slug}`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> {section.name}
          </Link>
          <PostForm lockedCategoryId={categoryId} basePath={`/content/${section.slug}`} itemLabel={section.itemLabel} />
        </>
      )}
    </SectionGate>
  );
}
