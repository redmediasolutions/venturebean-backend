/**
 * All Firestore reads/writes for categories live here.
 */
import {
  addDoc,
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { toDate } from "@/firebase/converters";
import type { Category, CategoryInput } from "../types";

export const categoriesCollection = () => collection(db(), COLLECTIONS.categories);

export const categoriesQuery = () => query(categoriesCollection(), orderBy("name"));

export function mapCategory(d: QueryDocumentSnapshot<DocumentData>): Category {
  const data = d.data();
  return {
    id: d.id,
    name: data.name ?? "",
    slug: data.slug ?? "",
    description: data.description ?? "",
    parentId: data.parentId ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function createCategory(input: CategoryInput) {
  const ref = await addDoc(categoriesCollection(), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCategory(id: string, input: CategoryInput) {
  await updateDoc(doc(db(), COLLECTIONS.categories, id), { ...input, updatedAt: serverTimestamp() });
}
