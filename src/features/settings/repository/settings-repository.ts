import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";
import { DEFAULT_SETTINGS, type SiteSettings } from "../types";

const settingsDoc = () => doc(db(), COLLECTIONS.settings, "general");

export function subscribeToSettings(cb: (s: SiteSettings) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    settingsDoc(),
    (snap) => cb({ ...DEFAULT_SETTINGS, ...(snap.data() as Partial<SiteSettings> | undefined) }),
    (e) => onError?.(e)
  );
}

export async function saveSettings(settings: SiteSettings) {
  await setDoc(settingsDoc(), { ...settings, updatedAt: serverTimestamp() }, { merge: true });
}
