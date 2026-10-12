import {
  collection,
  deleteDoc,
  doc,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { toDate } from "@/firebase/converters";
import type { TeamMember } from "../types";

// No orderBy here: admins added by hand in the console may not have a createdAt field.
export const teamQuery = () => query(collection(db(), COLLECTIONS.admins));

export function mapMember(d: QueryDocumentSnapshot<DocumentData>): TeamMember {
  const data = d.data({ serverTimestamps: "estimate" });
  return {
    uid: d.id,
    name: data.name ?? "",
    email: data.email ?? "",
    role: data.role === "owner" ? "owner" : "admin",
    createdAt: toDate(data.createdAt),
  };
}

export async function addAdminRecord(uid: string, data: { name: string; email: string; addedBy: string }) {
  await setDoc(doc(db(), COLLECTIONS.admins, uid), { ...data, role: "admin", createdAt: serverTimestamp() });
}

export async function removeAdminRecord(uid: string) {
  await deleteDoc(doc(db(), COLLECTIONS.admins, uid));
}
