/**
 * Categories — read and saved through the server API (/api/categories),
 * the same way posts use /api/posts.
 */
import { apiDelete, apiGet, apiPatch, apiPost, toDate } from "@/lib/api-client";
import { invalidate } from "@/hooks/use-api-resource";
import type { Category, CategoryInput } from "../types";

export const CATEGORIES_KEY = "categories";

export function mapCategory(raw: Record<string, unknown>): Category {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    slug: String(raw.slug ?? ""),
    description: String(raw.description ?? ""),
    parentId: (raw.parentId as string | null) ?? null,
    image: (raw.image as string | null) ?? null,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

export async function fetchCategories(): Promise<Category[]> {
  const { categories } = await apiGet<{ categories: Record<string, unknown>[] }>("/api/categories");
  return (categories ?? []).map(mapCategory);
}

/** Create a category and return its id. */
export async function createCategory(input: CategoryInput & { image?: string | null }): Promise<string> {
  const { id } = await apiPost<{ id: string }>("/api/categories", input);
  invalidate(CATEGORIES_KEY);
  return id;
}

export async function updateCategory(id: string, input: Partial<CategoryInput> & { image?: string | null }) {
  await apiPatch(`/api/categories/${encodeURIComponent(id)}`, input);
  invalidate(CATEGORIES_KEY, "posts");
}

export async function deleteCategoryById(id: string) {
  await apiDelete(`/api/categories/${encodeURIComponent(id)}`);
  invalidate(CATEGORIES_KEY, "posts");
}
