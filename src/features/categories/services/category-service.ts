/**
 * Category "business rules": unique slugs, and keeping posts in sync
 * when a category is renamed or deleted.
 */
import {
  arrayRemove,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { slugify } from "@/lib/slugify";
import { createCategory, updateCategory } from "../repository/category-repository";
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
  const before = all.find((c) => c.id === id);
  await updateCategory(id, data);

  // Posts store their category slugs too (so Astro can filter by slug).
  // If the slug changed, update every post in this category.
  if (before && before.slug !== data.slug) {
    const updated = all.map((c) => (c.id === id ? { ...c, ...data } : c));
    await resyncPostCategorySlugs(id, updated);
  }
}

async function resyncPostCategorySlugs(categoryId: string, all: Category[]) {
  const posts = await getDocs(
    query(collection(db(), COLLECTIONS.posts), where("categoryIds", "array-contains", categoryId))
  );
  const slugById = new Map(all.map((c) => [c.id, c.slug]));
  let batch = writeBatch(db());
  let count = 0;
  for (const p of posts.docs) {
    const ids: string[] = p.data().categoryIds ?? [];
    batch.update(p.ref, { categorySlugs: ids.map((i) => slugById.get(i)).filter(Boolean) });
    if (++count % 450 === 0) {
      await batch.commit();
      batch = writeBatch(db());
    }
  }
  await batch.commit();
}

/** Delete a category and remove it from every post that used it. */
export async function deleteCategory(category: Category, all: Category[]) {
  const posts = await getDocs(
    query(collection(db(), COLLECTIONS.posts), where("categoryIds", "array-contains", category.id))
  );
  const batch = writeBatch(db());
  posts.docs.forEach((p) =>
    batch.update(p.ref, {
      categoryIds: arrayRemove(category.id),
      categorySlugs: arrayRemove(category.slug),
    })
  );
  // Sub-categories move up one level.
  all
    .filter((c) => c.parentId === category.id)
    .forEach((child) =>
      batch.update(doc(db(), COLLECTIONS.categories, child.id), { parentId: category.parentId ?? null })
    );
  batch.delete(doc(db(), COLLECTIONS.categories, category.id));
  await batch.commit();
}
