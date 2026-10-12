import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { stripUndefined, toDate, toTimestamp } from "@/firebase/converters";
import type { Post, PostInput } from "../types";

const postsCollection = () => collection(db(), COLLECTIONS.posts);

export const postsQuery = () => query(postsCollection(), orderBy("updatedAt", "desc"));

export function mapPost(d: DocumentSnapshot<DocumentData>): Post {
  const data = d.data({ serverTimestamps: "estimate" }) ?? {};
  return {
    id: d.id,
    title: data.title ?? "",
    slug: data.slug ?? "",
    content: data.content ?? "",
    excerpt: data.excerpt ?? "",
    featuredImage: data.featuredImage ?? null,
    categoryIds: data.categoryIds ?? [],
    categorySlugs: data.categorySlugs ?? [],
    status: data.status === "published" ? "published" : "draft",
    publishedAt: toDate(data.publishedAt),
    seoTitle: data.seoTitle ?? "",
    seoDescription: data.seoDescription ?? "",
    customFields: data.customFields ?? {},
    authorId: data.authorId ?? "",
    authorName: data.authorName ?? "",
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function toFirestore(input: PostInput & { categorySlugs: string[] }) {
  const { publishedAt, ...rest } = input;
  return { ...stripUndefined(rest as unknown as Record<string, unknown>), publishedAt: toTimestamp(publishedAt) };
}

export async function getPost(id: string): Promise<Post | null> {
  const snap = await getDoc(doc(db(), COLLECTIONS.posts, id));
  return snap.exists() ? mapPost(snap) : null;
}

export async function findPostIdsBySlug(slug: string): Promise<string[]> {
  const snap = await getDocs(query(postsCollection(), where("slug", "==", slug), limit(5)));
  return snap.docs.map((d) => d.id);
}

export async function createPost(input: PostInput & { categorySlugs: string[] }) {
  const ref = await addDoc(postsCollection(), {
    ...toFirestore(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePost(id: string, input: PostInput & { categorySlugs: string[] }) {
  await updateDoc(doc(db(), COLLECTIONS.posts, id), { ...toFirestore(input), updatedAt: serverTimestamp() });
}

export async function setPostStatus(id: string, status: Post["status"]) {
  await updateDoc(doc(db(), COLLECTIONS.posts, id), { status, updatedAt: serverTimestamp() });
}

export async function deletePost(id: string) {
  await deleteDoc(doc(db(), COLLECTIONS.posts, id));
}
