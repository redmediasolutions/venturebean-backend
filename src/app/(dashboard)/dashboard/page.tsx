"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Award, Plus } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { usePosts } from "@/features/posts/hooks/use-posts";
import { PostStatusBadge } from "@/features/posts/lib/post-status";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { SECTIONS } from "@/features/sections/lib/sections";
import { useSections } from "@/features/sections/hooks/use-sections";
import { useLogos } from "@/features/logos/hooks/use-logos";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { QuickDraft } from "@/features/dashboard/components/quick-draft";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { posts, loading } = usePosts();
  const { categories } = useCategories();
  const { categoryIds } = useSections();
  const { logos, groups, loading: logosLoading } = useLogos();

  const rawName = user?.displayName || user?.email?.split("@")[0] || "";
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  // Which section does each post belong to?
  const sectionOf = useMemo(() => {
    const bySectionId = new Map(SECTIONS.map((s) => [categoryIds[s.slug], s]));
    return (categoryIdsOfPost: string[]) => categoryIdsOfPost.map((id) => bySectionId.get(id)).find(Boolean) ?? null;
  }, [categoryIds]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of posts) {
      const s = sectionOf(p.categoryIds);
      if (s) m.set(s.slug, (m.get(s.slug) ?? 0) + 1);
    }
    return m;
  }, [posts, sectionOf]);

  const recent = useMemo(
    () =>
      posts
        .flatMap((p) => {
          const section = sectionOf(p.categoryIds);
          return section ? [{ post: p, section }] : [];
        })
        .slice(0, 8),
    [posts, sectionOf]
  );

  return (
    <>
      <PageHeader
        title={`${greeting()}${name ? `, ${name}` : ""}`}
        description="Here's what's on your website's Knowledge Hub."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {SECTIONS.map((s) => (
          <StatCard key={s.slug} label={s.name} value={counts.get(s.slug) ?? 0} icon={s.icon} href={`/content/${s.slug}`} loading={loading} />
        ))}
        <StatCard label="Logos" value={logos.length} icon={Award} href="/logos" loading={logosLoading} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <Card className="gap-0 pb-0">
          <CardHeader className="border-b">
            <CardTitle>Recently edited</CardTitle>
          </CardHeader>
          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="space-y-4 p-8 text-center text-sm text-muted-foreground">
              <p>Nothing here yet. Start with one of the sections:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SECTIONS.map((s) => (
                  <Button key={s.slug} variant="outline" size="sm" asChild>
                    <Link href={`/content/${s.slug}/new`}>
                      <Plus /> {s.name}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map(({ post: p, section: s }) => (
                <li key={p.id}>
                  <Link
                    href={`/content/${s.slug}/${p.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <s.icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.title || "(no title)"}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.name} · edited {formatDate(p.updatedAt, true)}
                      </p>
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
              <CardTitle>Logo groups</CardTitle>
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No groups yet.{" "}
                  <Link href="/logos" className="text-foreground underline underline-offset-4">
                    Add logos
                  </Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {groups.map((g) => (
                    <Badge key={g.id} variant="secondary" className="font-normal">
                      {g.name} <span className="text-muted-foreground tabular-nums">{g.count}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
