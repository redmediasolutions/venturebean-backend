"use client";

import Link from "next/link";
import { Blocks, FileText, Folder, Image, PenLine, Plus } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { usePosts } from "@/features/posts/hooks/use-posts";
import { PostStatusBadge } from "@/features/posts/lib/post-status";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useMedia } from "@/features/media/hooks/use-media";
import { useFieldGroups } from "@/features/custom-fields/hooks/use-field-groups";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { QuickDraft } from "@/features/dashboard/components/quick-draft";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { posts, countsByCategory, loading } = usePosts();
  const { categories, tree, loading: catLoading } = useCategories();
  const { media, loading: mediaLoading } = useMedia();
  const { groups } = useFieldGroups();

  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.filter((p) => p.status === "draft").length;
  const rawName = user?.displayName || user?.email?.split("@")[0] || "";
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  return (
    <>
      <PageHeader
        title={`${greeting()}${name ? `, ${name}` : ""}`}
        description="Here's what's happening with your website content."
        actions={
          <Button asChild>
            <Link href="/posts/new">
              <Plus /> New post
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Published posts" value={published} icon={FileText} href="/posts" loading={loading} />
        <StatCard label="Drafts" value={drafts} icon={PenLine} href="/posts" loading={loading} />
        <StatCard label="Categories" value={categories.length} icon={Folder} href="/categories" loading={catLoading} />
        <StatCard label="Media files" value={media.length} icon={Image} href="/media" loading={mediaLoading} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <Card className="gap-0 pb-0">
          <CardHeader className="border-b">
            <CardTitle>Recently edited</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/posts">View all</Link>
              </Button>
            </CardAction>
          </CardHeader>
          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No posts yet.{" "}
              <Link href="/posts/new" className="text-foreground underline underline-offset-4">
                Write your first one
              </Link>
            </div>
          ) : (
            <ul className="divide-y">
              {posts.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link href={`/posts/${p.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.title || "(no title)"}</p>
                      <p className="text-xs text-muted-foreground">Edited {formatDate(p.updatedAt, true)}</p>
                    </div>
                    <PostStatusBadge post={p} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <QuickDraft categories={categories} />

          <Card>
            <CardHeader>
              <CardTitle>Posts by category</CardTitle>
            </CardHeader>
            <CardContent>
              {tree.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No categories yet.{" "}
                  <Link href="/categories" className="text-foreground underline underline-offset-4">
                    Add one
                  </Link>
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {tree.slice(0, 8).map((c) => (
                    <li key={c.id} className="flex items-center justify-between" style={{ paddingLeft: c.depth * 14 }}>
                      <Link href={`/posts?category=${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                      <span className="text-muted-foreground tabular-nums">{countsByCategory.get(c.id) ?? 0}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                <Blocks className="size-3.5" /> {groups.length} custom field group{groups.length === 1 ? "" : "s"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
