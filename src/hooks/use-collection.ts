"use client";

import { useEffect, useState } from "react";
import { onSnapshot, type DocumentData, type Query, type QueryDocumentSnapshot } from "firebase/firestore";

/**
 * Live-subscribe to a Firestore query.
 * The list updates automatically whenever something changes.
 */
export function useCollection<T>(
  buildQuery: () => Query<DocumentData> | null,
  mapDoc: (doc: QueryDocumentSnapshot<DocumentData>) => T,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = buildQuery();
    if (!q) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setData(snapshot.docs.map(mapDoc));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
