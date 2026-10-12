"use client";

import { useEffect, useMemo, useState } from "react";
import { useCollection } from "@/hooks/use-collection";
import { getPost, mapPost, postsQuery } from "../repository/post-repository";
import type { Post } from "../types";

/** Live list of all posts (most recently edited first). */
export function usePosts() {
  const { data, loading, error } = useCollection(postsQuery, mapPost);

  const countsByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of data) for (const id of p.categoryIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [data]);

  return { posts: data, countsByCategory, loading, error };
}

/** Load a single post for the edit screen. */
export function usePost(id: string | undefined) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getPost(id)
      .then((p) => {
        if (cancelled) return;
        setPost(p);
        setNotFound(!p);
      })
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { post, loading, notFound };
}
