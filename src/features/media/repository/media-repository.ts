import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "@/firebase/config";
import { COLLECTIONS, MEDIA_FOLDER } from "@/firebase/collections";
import { toDate } from "@/firebase/converters";
import { readImageSize, safeFileName } from "../lib/media-utils";
import type { MediaItem } from "../types";

export const mediaQuery = () => query(collection(db(), COLLECTIONS.media), orderBy("createdAt", "desc"));

export function mapMedia(d: QueryDocumentSnapshot<DocumentData>): MediaItem {
  const data = d.data({ serverTimestamps: "estimate" });
  return {
    id: d.id,
    name: data.name ?? "",
    url: data.url ?? "",
    path: data.path ?? "",
    contentType: data.contentType ?? "",
    size: data.size ?? 0,
    alt: data.alt ?? "",
    width: data.width ?? null,
    height: data.height ?? null,
    createdAt: toDate(data.createdAt),
  };
}

/** Upload a file to Firebase Storage and add it to the Media Library. */
export async function uploadMediaFile(file: File, onProgress?: (percent: number) => void): Promise<MediaItem> {
  const now = new Date();
  const folder = `${MEDIA_FOLDER}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const path = `${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const storageRef = ref(storage(), path);
  const size = await readImageSize(file);

  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type || "application/octet-stream",
    cacheControl: "public, max-age=31536000",
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      () => resolve()
    );
  });

  const url = await getDownloadURL(storageRef);
  const record = {
    name: file.name,
    url,
    path,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    alt: "",
    width: size?.width ?? null,
    height: size?.height ?? null,
  };
  const docRef = await addDoc(collection(db(), COLLECTIONS.media), { ...record, createdAt: serverTimestamp() });
  return { id: docRef.id, ...record, createdAt: now };
}

export async function updateMediaDetails(id: string, data: { alt: string; name: string }) {
  await updateDoc(doc(db(), COLLECTIONS.media, id), data);
}

export async function deleteMediaItem(item: MediaItem) {
  try {
    await deleteObject(ref(storage(), item.path));
  } catch (err) {
    // If the file is already gone from Storage, still remove the library entry.
    if ((err as { code?: string }).code !== "storage/object-not-found") throw err;
  }
  await deleteDoc(doc(db(), COLLECTIONS.media, item.id));
}
