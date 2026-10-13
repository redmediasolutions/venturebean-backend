/**
 * Saving logos and logo groups. Logos are posts in the "Clients" category,
 * groups are its sub-categories — this keeps the website integration simple.
 */
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import type { Category } from "@/features/categories/types";
import { deleteCategory, saveCategoryChanges, saveNewCategory } from "@/features/categories/services/category-service";
import { deletePost } from "@/features/posts/repository/post-repository";
import { savePost } from "@/features/posts/services/post-service";
import type { PostInput } from "@/features/posts/types";
import { LOGO_FIELDS, LOGOS_ROOT } from "../lib/logo-utils";
import type { Logo, LogoInput } from "../types";

/** Make sure the "Clients" category exists and return its id. */
export async function ensureLogosRoot(categories: Category[]): Promise<string> {
  const existing = categories.find((c) => c.slug === LOGOS_ROOT.slug);
  if (existing) return existing.id;
  return saveNewCategory({ name: LOGOS_ROOT.name, slug: LOGOS_ROOT.slug, description: "", parentId: null }, categories);
}

function toPostInput(input: LogoInput, rootId: string, author: { uid: string; name: string }, base?: Logo): PostInput {
  const p = base?.post;
  return {
    title: input.name.trim() || "Untitled logo",
    slug: p?.slug ?? "",
    content: p?.content ?? "",
    excerpt: p?.excerpt ?? "",
    featuredImage: input.image,
    categoryIds: input.groupId ? [rootId, input.groupId] : [rootId],
    status: input.published ? "published" : "draft",
    publishedAt: p?.publishedAt ?? (input.published ? new Date() : null),
    seoTitle: p?.seoTitle ?? "",
    seoDescription: p?.seoDescription ?? "",
    customFields: {
      ...(p?.customFields ?? {}),
      [LOGO_FIELDS.order]: input.order,
      [LOGO_FIELDS.size]: input.size,
      [LOGO_FIELDS.hideOnHome]: !input.onHome,
      [LOGO_FIELDS.hideOnClientsPage]: !input.onClientsPage,
    },
    authorId: p?.authorId ?? author.uid,
    authorName: p?.authorName ?? author.name,
  };
}

export async function createLogo(input: LogoInput, rootId: string, categories: Category[], author: { uid: string; name: string }) {
  if (!input.image) throw new Error("Please choose a logo image.");
  return savePost(toPostInput(input, rootId, author), categories);
}

export async function updateLogo(logo: Logo, input: LogoInput, rootId: string, categories: Category[]) {
  if (!input.image) throw new Error("Please choose a logo image.");
  return savePost(toPostInput(input, rootId, { uid: "", name: "" }, logo), categories, logo.id);
}

export async function removeLogo(logo: Logo) {
  await deletePost(logo.id);
}

/** Change only the display order (used by the move left/right buttons). */
export async function setLogoOrder(logoId: string, order: number) {
  await updateDoc(doc(db(), COLLECTIONS.posts, logoId), { [`customFields.${LOGO_FIELDS.order}`]: order });
}

/**
 * Move a logo one place earlier/later within `visible` (the list on screen).
 * If orders are missing or tied, the whole list is renumbered 1, 2, 3… first.
 */
export async function moveLogo(all: Logo[], visible: Logo[], logo: Logo, dir: -1 | 1) {
  const i = visible.findIndex((l) => l.id === logo.id);
  const other = visible[i + dir];
  if (!other) return;
  const orders = all.map((l) => l.order);
  const clean = orders.every((o) => o !== null) && new Set(orders).size === orders.length;
  if (!clean) {
    // Renumber everything in the current order, then swap.
    const numbered = new Map(all.map((l, idx) => [l.id, idx + 1]));
    await Promise.all(
      all.map((l) => {
        let n = numbered.get(l.id)!;
        if (l.id === logo.id) n = numbered.get(other.id)!;
        else if (l.id === other.id) n = numbered.get(logo.id)!;
        return l.order === n ? null : setLogoOrder(l.id, n);
      })
    );
    return;
  }
  await Promise.all([setLogoOrder(logo.id, other.order!), setLogoOrder(other.id, logo.order!)]);
}

/* ---------------- Groups ---------------- */

export async function createGroup(name: string, rootId: string, categories: Category[]) {
  if (!name.trim()) throw new Error("Please enter a group name.");
  return saveNewCategory({ name, slug: "", description: "", parentId: rootId }, categories);
}

export async function renameGroup(groupId: string, name: string, rootId: string, categories: Category[]) {
  if (!name.trim()) throw new Error("Please enter a group name.");
  const current = categories.find((c) => c.id === groupId);
  await saveCategoryChanges(groupId, { name, slug: "", description: current?.description ?? "", parentId: rootId }, categories);
}

/** Deletes the group. Its logos are kept (they just won't be in a group). */
export async function removeGroup(groupId: string, categories: Category[]) {
  const group = categories.find((c) => c.id === groupId);
  if (group) await deleteCategory(group, categories);
}
