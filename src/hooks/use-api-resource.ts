"use client";

/**
 * Shared, cached data from an API route — e.g. the list of categories.
 *
 * Every component that asks for the same `key` shares one copy. After
 * saving something, call `invalidate("categories")` and every screen showing
 * categories (sidebar, dropdowns, tables) refreshes. This replaces the live
 * Firestore listeners now that all data goes through the server.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";

interface Snapshot<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
}

interface Entry<T> {
  snap: Snapshot<T>;
  promise: Promise<void> | null;
  fetcher: () => Promise<T>;
  listeners: Set<() => void>;
  stale: boolean;
}

const store = new Map<string, Entry<unknown>>();

function getEntry<T>(key: string, fetcher: () => Promise<T>): Entry<T> {
  let e = store.get(key) as Entry<T> | undefined;
  if (!e) {
    e = { snap: { data: undefined, loading: true, error: null }, promise: null, fetcher, listeners: new Set(), stale: true };
    store.set(key, e as Entry<unknown>);
  }
  e.fetcher = fetcher;
  return e;
}

function update<T>(e: Entry<T>, patch: Partial<Snapshot<T>>) {
  e.snap = { ...e.snap, ...patch }; // new object → React re-renders
  e.listeners.forEach((l) => l());
}

function load<T>(e: Entry<T>): Promise<void> {
  if (e.promise) return e.promise;
  e.stale = false;
  e.promise = e
    .fetcher()
    .then((data) => update(e, { data, error: null, loading: false }))
    .catch((err) => {
      console.error(err);
      update(e, { error: err instanceof Error ? err.message : String(err), loading: false });
    })
    .finally(() => {
      e.promise = null;
    });
  return e.promise;
}

/** Re-fetch everywhere. Pass several keys to refresh related data. */
export function invalidate(...keys: string[]) {
  for (const key of keys) {
    const e = store.get(key);
    if (!e) continue;
    e.stale = true;
    if (e.listeners.size) void load(e);
  }
}

export function useApiResource<T>(key: string, fetcher: () => Promise<T>, fallback: T) {
  const e = getEntry(key, fetcher);

  const subscribe = useCallback(
    (cb: () => void) => {
      e.listeners.add(cb);
      return () => e.listeners.delete(cb);
    },
    [e]
  );
  const getSnapshot = useCallback(() => e.snap, [e]);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (e.stale) void load(e);
  }, [e]);

  const refresh = useCallback(() => load(e), [e]);

  return { data: snap.data ?? fallback, loading: snap.loading && snap.data === undefined, error: snap.error, refresh };
}
