/**
 * Custom field groups — read and saved through /api/field-groups.
 */
import { apiDelete, apiGet, apiPatch, apiPost, toDate } from "@/lib/api-client";
import { invalidate } from "@/hooks/use-api-resource";
import type { FieldGroup, FieldGroupInput } from "../types";

export const FIELD_GROUPS_KEY = "field-groups";

export function mapFieldGroup(raw: Record<string, unknown>): FieldGroup {
  const fields = Array.isArray(raw.fields) ? (raw.fields as Record<string, unknown>[]) : [];
  return {
    id: String(raw.id),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    location: raw.location === "categories" ? "categories" : "all",
    categoryIds: Array.isArray(raw.categoryIds) ? raw.categoryIds.map(String) : [],
    fields: fields.map((f) => ({
      id: String(f.id ?? Math.random().toString(36).slice(2, 10)),
      label: String(f.label ?? ""),
      name: String(f.name ?? ""),
      type: (f.type as FieldGroup["fields"][number]["type"]) ?? "text",
      required: Boolean(f.required),
      instructions: String(f.instructions ?? ""),
      placeholder: String(f.placeholder ?? ""),
      options: Array.isArray(f.options) ? f.options.map(String) : [],
    })),
    active: raw.active !== false,
    order: typeof raw.order === "number" ? raw.order : 0,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

export async function fetchFieldGroups(): Promise<FieldGroup[]> {
  const { groups } = await apiGet<{ groups: Record<string, unknown>[] }>("/api/field-groups");
  return (groups ?? []).map(mapFieldGroup).sort((a, b) => a.order - b.order);
}

export async function getFieldGroup(id: string): Promise<FieldGroup | null> {
  try {
    const { group } = await apiGet<{ group: Record<string, unknown> }>(`/api/field-groups/${encodeURIComponent(id)}`);
    return group ? mapFieldGroup(group) : null;
  } catch {
    return null;
  }
}

export async function createFieldGroup(input: FieldGroupInput) {
  const { id } = await apiPost<{ id: string }>("/api/field-groups", input);
  invalidate(FIELD_GROUPS_KEY);
  return id;
}

export async function updateFieldGroup(id: string, input: Partial<FieldGroupInput>) {
  await apiPatch(`/api/field-groups/${encodeURIComponent(id)}`, input);
  invalidate(FIELD_GROUPS_KEY);
}

export async function deleteFieldGroup(id: string) {
  await apiDelete(`/api/field-groups/${encodeURIComponent(id)}`);
  invalidate(FIELD_GROUPS_KEY);
}
