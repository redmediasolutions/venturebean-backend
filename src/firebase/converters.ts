import { Timestamp } from "firebase/firestore";

/** Firestore stores dates as Timestamps — turn them into normal JS Dates. */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Turn a JS Date into a Firestore Timestamp (or null). */
export function toTimestamp(value: Date | null | undefined): Timestamp | null {
  return value ? Timestamp.fromDate(value) : null;
}

/** Firestore does not accept `undefined` — remove those keys before saving. */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_k, v) => (v === undefined ? null : v))) as T;
}
