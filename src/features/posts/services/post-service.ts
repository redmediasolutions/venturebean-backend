/**
 * Post "business rules": slugs, required fields, publish dates.
 */
import { slugify } from "@/lib/slugify";
import type { Category } from "@/features/categories/types";
import type { FieldGroup } from "@/features/custom-fields/types";
import { isEmptyValue } from "@/features/custom-fields/lib/field-types";
import { groupsForPost } from "@/features/custom-fields/services/field-group-service";
import { createPost, findPostIdsBySlug, updatePost } from "../repository/post-repository";
import type { Post, PostInput } from "../types";

/** Make sure no two posts share the same slug: "my-post", "my-post-2", … */
export async function makeUniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "untitled";
  let candidate = root;
  for (let i = 2; i < 100; i++) {
    const ids = (await findPostIdsBySlug(candidate)).filter((id) => id !== ignoreId);
    if (ids.length === 0) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

/** Required custom fields that are still empty → { field_name: "message" } */
export function validateCustomFields(input: PostInput, groups: FieldGroup[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const group of groupsForPost(groups, input.categoryIds)) {
    for (const field of group.fields) {
      if (field.required && isEmptyValue(field, input.customFields[field.name])) {
        errors[field.name] = `${field.label} is required.`;
      }
    }
  }
  return errors;
}

export async function savePost(
  input: PostInput,
  categories: Category[],
  id?: string
): Promise<{ id: string; slug: string }> {
  const title = input.title.trim();
  if (input.status === "published" && !title) throw new Error("Please add a title before publishing.");

  const slug = await makeUniqueSlug(input.slug || title || "untitled", id);
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));
  const categoryIds = [...new Set(input.categoryIds)];

  const data = {
    ...input,
    title,
    slug,
    categoryIds,
    categorySlugs: categoryIds.map((cid) => slugById.get(cid)).filter((s): s is string => Boolean(s)),
    excerpt: input.excerpt.trim(),
    seoTitle: input.seoTitle.trim(),
    seoDescription: input.seoDescription.trim(),
    publishedAt: input.status === "published" ? input.publishedAt ?? new Date() : input.publishedAt,
  };

  if (id) {
    await updatePost(id, data);
    return { id, slug };
  }
  return { id: await createPost(data), slug };
}

/** Copy a post as a new draft. */
export async function duplicatePost(post: Post, categories: Category[]) {
  const { id: _id, createdAt: _c, updatedAt: _u, categorySlugs: _s, ...rest } = post;
  return savePost(
    { ...rest, title: `${post.title} (copy)`, slug: `${post.slug}-copy`, status: "draft", publishedAt: null },
    categories
  );
}
