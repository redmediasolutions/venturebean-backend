"use client";

import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useFieldGroups } from "@/features/custom-fields/hooks/use-field-groups";
import { ensureSectionFields } from "../services/section-service";

interface SectionsContextValue {
  /** category slug → category id */
  categoryIds: Record<string, string>;
  ready: boolean;
}

let fieldsAttempted = false;

const SectionsContext = createContext<SectionsContextValue>({ categoryIds: {}, ready: false });

export function SectionsProvider({ children }: { children: React.ReactNode }) {
  const { categories, loading: categoriesLoading } = useCategories();
  const { groups, loading: groupsLoading } = useFieldGroups();
  const running = useRef(false);

  // Directly map existing categories by slug without hardcoded section filters
  const categoryIds = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) {
      if (c.slug) map[c.slug] = c.id;
    }
    return map;
  }, [categories]);

  useEffect(() => {
    if (categoriesLoading || groupsLoading || running.current) return;
    if (fieldsAttempted || groups.some((g) => g.title === "Links & downloads")) return;

    running.current = true;
    (async () => {
      try {
        if (!fieldsAttempted) {
          fieldsAttempted = true;
          await ensureSectionFields(groups, Object.values(categoryIds));
        }
      } catch (err) {
        console.error("Could not set up section fields:", err);
      } finally {
        running.current = false;
      }
    })();
  }, [categoriesLoading, groupsLoading, categoryIds, groups]);

  const value = useMemo(
    () => ({
      categoryIds,
      ready: !categoriesLoading && !groupsLoading,
    }),
    [categoryIds, categoriesLoading, groupsLoading]
  );

  return createElement(SectionsContext.Provider, { value }, children);
}

export function useSections() {
  return useContext(SectionsContext);
}