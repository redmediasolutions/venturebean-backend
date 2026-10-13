"use client";

import { useMemo } from "react";
import { usePosts } from "@/features/posts/hooks/use-posts";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { LOGO_FIELDS, LOGOS_ROOT, num } from "../lib/logo-utils";
import type { Logo, LogoGroup } from "../types";

/** All logos and logo groups, live from Firebase. */
export function useLogos() {
  const { posts, loading: postsLoading } = usePosts();
  const { categories, loading: catLoading } = useCategories();

  return useMemo(() => {
    const root = categories.find((c) => c.slug === LOGOS_ROOT.slug) ?? null;
    if (!root) return { root, groups: [] as LogoGroup[], logos: [] as Logo[], categories, loading: postsLoading || catLoading };

    const groupCats = categories.filter((c) => c.parentId === root.id).sort((a, b) => a.name.localeCompare(b.name));
    const groupIds = new Set(groupCats.map((g) => g.id));
    const inTree = new Set([root.id, ...groupIds]);

    const logos: Logo[] = posts
      .filter((p) => p.categoryIds.some((id) => inTree.has(id)))
      .map((p) => {
        const f = p.customFields ?? {};
        return {
          id: p.id,
          name: p.title,
          image: p.featuredImage,
          groupId: p.categoryIds.find((id) => groupIds.has(id)) ?? null,
          order: num(f[LOGO_FIELDS.order]),
          size: num(f[LOGO_FIELDS.size]),
          onHome: f[LOGO_FIELDS.hideOnHome] !== true,
          onClientsPage: f[LOGO_FIELDS.hideOnClientsPage] !== true,
          published: p.status === "published",
          post: p,
        };
      })
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.name.localeCompare(b.name));

    const groups: LogoGroup[] = groupCats.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      count: logos.filter((l) => l.groupId === g.id).length,
    }));

    return { root, groups, logos, categories, loading: postsLoading || catLoading };
  }, [posts, categories, postsLoading, catLoading]);
}
