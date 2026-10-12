import { toFieldName } from "@/lib/slugify";
import { createFieldGroup, updateFieldGroup } from "../repository/field-group-repository";
import type { FieldGroup, FieldGroupInput } from "../types";

/** Check a field group before saving and return a cleaned-up copy. */
export function validateFieldGroup(input: FieldGroupInput, allGroups: FieldGroup[], ignoreId?: string): FieldGroupInput {
  if (!input.title.trim()) throw new Error("Please give the field group a title.");
  if (input.location === "categories" && input.categoryIds.length === 0) {
    throw new Error("Choose at least one category, or set “Show this group on” to All posts.");
  }

  const fields = input.fields.map((f) => ({
    ...f,
    label: f.label.trim(),
    name: toFieldName(f.name || f.label),
    instructions: f.instructions.trim(),
    placeholder: f.placeholder.trim(),
    options: f.type === "select" ? f.options.map((o) => o.trim()).filter(Boolean) : [],
  }));

  const seen = new Set<string>();
  for (const f of fields) {
    if (!f.label) throw new Error("Every field needs a label.");
    if (!f.name) throw new Error(`Field “${f.label}” needs a name.`);
    if (seen.has(f.name)) throw new Error(`Two fields use the same name “${f.name}”. Names must be unique.`);
    if (f.type === "select" && f.options.length === 0) throw new Error(`Dropdown “${f.label}” needs at least one choice.`);
    seen.add(f.name);
  }

  // Values are saved on the post by field name, so two groups that can appear on
  // the SAME post must not use the same field name.
  const canOverlap = (g: FieldGroup) =>
    input.location === "all" || g.location === "all" || g.categoryIds.some((id) => input.categoryIds.includes(id));
  for (const g of allGroups) {
    if (g.id === ignoreId || !canOverlap(g)) continue;
    for (const f of g.fields) {
      if (seen.has(f.name)) {
        throw new Error(`The field name “${f.name}” is already used in the group “${g.title}”. Please choose another name.`);
      }
    }
  }

  return { ...input, title: input.title.trim(), description: input.description.trim(), fields };
}

export async function saveFieldGroup(input: FieldGroupInput, allGroups: FieldGroup[], id?: string) {
  const clean = validateFieldGroup(input, allGroups, id);
  if (id) {
    await updateFieldGroup(id, clean);
    return id;
  }
  return createFieldGroup(clean);
}

/** Which field groups should appear on a post with these categories? */
export function groupsForPost(groups: FieldGroup[], categoryIds: string[]): FieldGroup[] {
  return groups
    .filter((g) => g.active)
    .filter((g) => g.location === "all" || g.categoryIds.some((id) => categoryIds.includes(id)))
    .sort((a, b) => a.order - b.order);
}
