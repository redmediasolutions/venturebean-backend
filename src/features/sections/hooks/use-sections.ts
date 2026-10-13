"use client";

/**
 * Gives every page the category id of each Knowledge Hub section,
 * creating the categories on first use.
 */
import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useFieldGroups } from "@/features/custom-fields/hooks/use-field-groups";
import { SECTIONS } from "../lib/sections";
import { ensureSectionCategories, ensureSectionFields } from "../services/section-service";

interface SectionsContextValue {
  /** section slug → category id (empty until loaded) */
  categoryIds: Record<string, string>;
  ready: boolean;
}

// Only try to create the extra fields once per page load (avoids duplicates).
let fieldsAttempted = false;

const SectionsContext = createContext<SectionsContextValue>({ categoryIds: {}, ready: false });

export function SectionsProvider({ children }: { children: React.ReactNode }) {
  const { categories, loading } = useCategories();
  const { groups, loading: groupsLoading } = useFieldGroups();
  const [ids, setIds] = useState<Record<string, string>>({});
  const running = useRef(false);

  const fromCategories = useMemo(() => {
    const bySlug = new Map(categories.map((c) => [c.slug, c.id]));
    const found: Record<string, string> = {};
    for (const s of SECTIONS) {
      const id = bySlug.get(s.slug);
      if (id) found[s.slug] = id;
    }
    return found;
  }, [categories]);

  const complete = Object.keys(fromCategories).length === SECTIONS.length;

  useEffect(() => {
    if (loading || groupsLoading || running.current) return;
    if (complete && (fieldsAttempted || groups.some((g) => g.title === "Links & downloads"))) return;
    running.current = true;
    (async () => {
      try {
        const created = complete ? fromCategories : await ensureSectionCategories(categories);
        setIds(created);
        if (!fieldsAttempted) {
          fieldsAttempted = true;
          await ensureSectionFields(groups, Object.values(created));
        }
      } catch (err) {
        console.error("Could not set up Knowledge Hub sections:", err);
      } finally {
        running.current = false;
      }
    })();
  }, [loading, groupsLoading, complete, fromCategories, categories, groups]);

  const value = useMemo(
    () => ({ categoryIds: complete ? fromCategories : ids, ready: complete || Object.keys(ids).length === SECTIONS.length }),
    [complete, fromCategories, ids]
  );
  return createElement(SectionsContext.Provider, { value }, children);
}

export function useSections() {
  return useContext(SectionsContext);
}
