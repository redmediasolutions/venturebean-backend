"use client";

import { useMemo } from "react";
import { useCollection } from "@/hooks/use-collection";
import { categoriesQuery, mapCategory } from "../repository/category-repository";
import { buildCategoryTree } from "../lib/category-tree";

/** Live list of all categories (sorted as a tree). */
export function useCategories() {
  const { data, loading, error } = useCollection(categoriesQuery, mapCategory);
  const tree = useMemo(() => buildCategoryTree(data), [data]);
  const byId = useMemo(() => new Map(data.map((c) => [c.id, c])), [data]);
  return { categories: data, tree, byId, loading, error };
}
