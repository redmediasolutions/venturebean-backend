"use client";

import { useCallback, useMemo } from "react";
import { useApiResource } from "@/hooks/use-api-resource";
import { CATEGORIES_KEY, createCategory as createCategoryInRepository, fetchCategories } from "../repository/category-repository";
import { buildCategoryTree } from "../lib/category-tree";
import type { Category, CategoryInput } from "../types";

const EMPTY: Category[] = [];

/** All categories, sorted as a tree. Refreshes everywhere after any change. */
export function useCategories() {
  const { data, loading, error, refresh } = useApiResource(CATEGORIES_KEY, fetchCategories, EMPTY);

  const tree = useMemo(() => buildCategoryTree(data), [data]);
  const byId = useMemo(() => new Map(data.map((category) => [category.id, category])), [data]);

  const createCategory = useCallback(async (input: CategoryInput) => createCategoryInRepository(input), []);

  return { categories: data, tree, byId, loading, error, createCategory, refresh };
}
