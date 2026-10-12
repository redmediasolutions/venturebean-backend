import type { Category } from "../types";

export interface CategoryWithDepth extends Category {
  depth: number;
}

/**
 * Sort categories like WordPress does: parents first, children indented below.
 */
export function buildCategoryTree(categories: Category[]): CategoryWithDepth[] {
  const byParent = new Map<string | null, Category[]>();
  const ids = new Set(categories.map((c) => c.id));
  for (const c of categories) {
    const parent = c.parentId && ids.has(c.parentId) ? c.parentId : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), c]);
  }
  const result: CategoryWithDepth[] = [];
  const visit = (parent: string | null, depth: number) => {
    for (const c of (byParent.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
      result.push({ ...c, depth });
      if (depth < 10) visit(c.id, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

/** All ids that are this category or below it (to stop choosing a child as parent). */
export function descendantIds(categories: Category[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let added = true;
  while (added) {
    added = false;
    for (const c of categories) {
      if (c.parentId && out.has(c.parentId) && !out.has(c.id)) {
        out.add(c.id);
        added = true;
      }
    }
  }
  return out;
}
