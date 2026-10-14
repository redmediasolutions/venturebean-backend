"use client";

import { useMemo, useCallback } from "react";

import { useCollection } from "@/hooks/use-collection";

import {
  categoriesQuery,
  mapCategory,
  createCategory as createCategoryInRepository,
} from "../repository/category-repository";

import { buildCategoryTree } from "../lib/category-tree";
import type { CategoryInput } from "../types";

/** Live list of all categories, sorted as a tree. */
export function useCategories() {
  const { data, loading, error } = useCollection(
    categoriesQuery,
    mapCategory,
  );

  const tree = useMemo(
    () => buildCategoryTree(data),
    [data],
  );

  const byId = useMemo(
    () => new Map(data.map((category) => [category.id, category])),
    [data],
  );

  const createCategory = useCallback(
    async (input: CategoryInput) => {
      return createCategoryInRepository(input);
    },
    [],
  );

  return {
    categories: data,
    tree,
    byId,
    loading,
    error,
    createCategory,
  };
}