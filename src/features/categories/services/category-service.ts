/**
 * Category "business rules". The server does the heavy lifting
 * (unique slugs, updating posts when a slug changes or a category is deleted).
 */
import { slugify } from "@/lib/slugify";
import { createCategory, deleteCategoryById, updateCategory } from "../repository/category-repository";
import type { Category, CategoryInput } from "../types";

function normalise(input: CategoryInput): CategoryInput {
  return {
    name: input.name.trim(),
    slug: slugify(input.slug || input.name),
    description: input.description.trim(),
    parentId: input.parentId || null,
  };
}

function assertUniqueSlug(slug: string, all: Category[], ignoreId?: string) {
  if (!slug) throw new Error("Please enter a name for the category.");
  if (all.some((c) => c.slug === slug && c.id !== ignoreId)) {
    throw new Error(`Another category already uses the slug “${slug}”.`);
  }
}

export async function saveNewCategory(input: CategoryInput, all: Category[]) {
  const data = normalise(input);
  assertUniqueSlug(data.slug, all);
  return createCategory(data);
}

export async function saveCategoryChanges(id: string, input: CategoryInput, all: Category[]) {
  const data = normalise(input);
  assertUniqueSlug(data.slug, all, id);
  if (data.parentId === id) throw new Error("A category can't be its own parent.");
  await updateCategory(id, data);
}

/** Delete a category. Its posts are kept; sub-categories move up one level. */
export async function deleteCategory(category: Category, _all?: Category[]) {
  await deleteCategoryById(category.id);
}
