/**
 * Makes sure the Knowledge Hub categories and the "Links & downloads" fields exist.
 * Runs automatically the first time an admin opens the panel — nothing to set up by hand.
 */
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import type { Category } from "@/features/categories/types";
import type { FieldGroup } from "@/features/custom-fields/types";
import { KNOWLEDGE_HUB, SECTIONS } from "../lib/sections";

export const SECTION_FIELDS_TITLE = "Links & downloads";

async function createCategory(name: string, slug: string, parentId: string | null) {
  const ref = await addDoc(collection(db(), COLLECTIONS.categories), {
    name,
    slug,
    description: "",
    parentId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Returns slug → category id for every section, creating any that are missing. */
export async function ensureSectionCategories(categories: Category[]): Promise<Record<string, string>> {
  const bySlug = new Map(categories.map((c) => [c.slug, c.id]));
  let hubId = bySlug.get(KNOWLEDGE_HUB.slug);
  if (!hubId) hubId = await createCategory(KNOWLEDGE_HUB.name, KNOWLEDGE_HUB.slug, null);
  const ids: Record<string, string> = {};
  for (const s of SECTIONS) {
    ids[s.slug] = bySlug.get(s.slug) ?? (await createCategory(s.name, s.slug, hubId));
  }
  return ids;
}

/** Adds "External link" + "Download (PDF)" fields to every section's edit screen. */
export async function ensureSectionFields(groups: FieldGroup[], sectionCategoryIds: string[]) {
  if (groups.some((g) => g.title === SECTION_FIELDS_TITLE)) return;
  const field = (name: string, label: string, type: "url" | "file", instructions: string) => ({
    id: Math.random().toString(36).slice(2, 10),
    name,
    label,
    type,
    instructions,
    required: false,
    placeholder: "",
    options: [],
  });
  await addDoc(collection(db(), COLLECTIONS.fieldGroups), {
    title: SECTION_FIELDS_TITLE,
    description: "Optional — link to the original article/video, or a file people can download.",
    location: "categories",
    categoryIds: sectionCategoryIds,
    fields: [
      field("external_link", "External link", "url", "e.g. the press article, YouTube video or podcast this is about."),
      field("download", "Download (PDF or file)", "file", "e.g. the report, worksheet or slide deck."),
    ],
    active: true,
    order: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
