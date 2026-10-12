import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { stripUndefined, toDate } from "@/firebase/converters";
import type { FieldGroup, FieldGroupInput } from "../types";

export const fieldGroupsQuery = () => query(collection(db(), COLLECTIONS.fieldGroups), orderBy("order"));

export function mapFieldGroup(d: DocumentSnapshot<DocumentData>): FieldGroup {
  const data = d.data() ?? {};
  return {
    id: d.id,
    title: data.title ?? "",
    description: data.description ?? "",
    location: data.location === "categories" ? "categories" : "all",
    categoryIds: data.categoryIds ?? [],
    fields: (data.fields ?? []).map((f: Record<string, unknown>) => ({
      id: String(f.id ?? Math.random().toString(36).slice(2, 10)),
      label: String(f.label ?? ""),
      name: String(f.name ?? ""),
      type: (f.type as FieldGroup["fields"][number]["type"]) ?? "text",
      required: Boolean(f.required),
      instructions: String(f.instructions ?? ""),
      placeholder: String(f.placeholder ?? ""),
      options: Array.isArray(f.options) ? f.options.map(String) : [],
    })),
    active: data.active !== false,
    order: typeof data.order === "number" ? data.order : 0,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getFieldGroup(id: string): Promise<FieldGroup | null> {
  const snap = await getDoc(doc(db(), COLLECTIONS.fieldGroups, id));
  return snap.exists() ? mapFieldGroup(snap) : null;
}

export async function createFieldGroup(input: FieldGroupInput) {
  const ref = await addDoc(collection(db(), COLLECTIONS.fieldGroups), {
    ...stripUndefined(input as unknown as Record<string, unknown>),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateFieldGroup(id: string, input: Partial<FieldGroupInput>) {
  await updateDoc(doc(db(), COLLECTIONS.fieldGroups, id), {
    ...stripUndefined(input as unknown as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFieldGroup(id: string) {
  await deleteDoc(doc(db(), COLLECTIONS.fieldGroups, id));
}
