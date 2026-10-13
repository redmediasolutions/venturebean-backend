"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { usePosts } from "@/features/posts/hooks/use-posts";
import { PostsTable } from "@/features/posts/components/posts-table";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useSiteSettings } from "@/features/settings/hooks/use-site-settings";
import { SectionGate } from "@/features/sections/components/section-gate";

function SectionList({ slug, name, description, itemLabel, categoryId }: { slug: string; name: string; description: string; itemLabel: string; categoryId: string }) {
  const { posts, loading } = usePosts();
  const { categories, tree, byId } = useCategories();
  const { settings } = useSiteSettings();
  const items = useMemo(() => posts.filter((p) => p.categoryIds.includes(categoryId)), [posts, categoryId]);
  const base = `/content/${slug}`;

  return (
    <>
      <PageHeader
        title={name}
        description={description}
        actions={
          <Button asChild>
            <Link href={`${base}/new`}>
              <Plus /> New {itemLabel}
            </Link>
          </Button>
        }
      />
      <PostsTable
        key={slug}
        posts={items}
        loading={loading}
        categories={categories}
        tree={tree}
        categoriesById={byId}
        settings={settings}
        basePath={base}
        itemLabel={itemLabel}
        showCategoryFilter={false}
      />
    </>
  );
}

export default function SectionPage() {
  return (
    <SectionGate>
      {(section, categoryId) => (
        <SectionList
          slug={section.slug}
          name={section.name}
          description={section.description}
          itemLabel={section.itemLabel}
          categoryId={categoryId}
        />
      )}
    </SectionGate>
  );
}
