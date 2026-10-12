"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { CategoryForm } from "@/features/categories/addform/category-form";
import { CategoriesTable } from "@/features/categories/components/categories-table";
import { usePosts } from "@/features/posts/hooks/use-posts";

export default function CategoriesPage() {
  const { categories, tree, loading } = useCategories();
  const { countsByCategory } = usePosts();

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group your posts — e.g. Blog, News, Events. Your website can show each category on its own page."
      />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="lg:sticky lg:top-20 lg:self-start">
          <CardHeader>
            <CardTitle>Add new category</CardTitle>
            <CardDescription>It will be available on the post screen straight away.</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryForm categories={categories} tree={tree} />
          </CardContent>
        </Card>
        <CategoriesTable categories={categories} tree={tree} postCounts={countsByCategory} loading={loading} />
      </div>
    </>
  );
}
