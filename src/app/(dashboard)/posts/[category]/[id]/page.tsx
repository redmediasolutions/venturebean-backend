"use client";

import { useParams } from "next/navigation";
import { EditPostScreen } from "@/features/posts/components/edit-post-screen";

/** /posts/coaching/<postId> — edit a post, with "back" going to Coaching. */
export default function EditPostInCategoryPage() {
  const { category, id } = useParams<{ category: string; id: string }>();
  return <EditPostScreen id={id} categorySlug={decodeURIComponent(category)} />;
}
