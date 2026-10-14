"use client";

import { useCallback, useEffect, useState } from "react";

import { POSTS_KEY, postsQuery } from "../repository/post-repository";
import { useApiResource } from "@/hooks/use-api-resource";
import type { Post } from "../types";

const NO_POSTS: Post[] = [];

/**
 * Loads posts through the authenticated Next.js API.
 *
 * Authentication is handled by the HTTP-only session cookie.
 * All screens share one copy: after a post is saved or deleted the list
 * refreshes everywhere (see invalidate("posts") in the repository).
 */
export function usePosts() {
  const { data, loading, error, refresh } = useApiResource(POSTS_KEY, postsQuery, NO_POSTS);
  const refreshPosts = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return {
    posts: data,
    loading,
    error,
    refreshPosts,
    refetch: refreshPosts,
  };
}

/**
 * Fetches a single post by ID.
 *
 * Usage:
 * const { post, loading, error, refetch } = usePost(id);
 */
export function usePost(id: string) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPost = useCallback(async () => {
    if (!id) {
      setPost(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await import("../repository/post-repository").then(
        ({ getPost }) => getPost(id),
      );

      setPost(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load post.";

      console.error("Failed to fetch post:", err);
      setError(message);
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refreshPost();
  }, [refreshPost]);

  return {
    post,
    loading,
    error,
    refreshPost,
    refetch: refreshPost,
  };
}