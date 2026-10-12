import { Badge } from "@/components/ui/badge";
import type { Post } from "../types";

export function PostStatusBadge({ post }: { post: Pick<Post, "status" | "publishedAt"> }) {
  if (post.status === "draft") return <Badge variant="outline">Draft</Badge>;
  if (post.publishedAt && post.publishedAt.getTime() > Date.now()) return <Badge variant="secondary">Scheduled</Badge>;
  return <Badge>Published</Badge>;
}
