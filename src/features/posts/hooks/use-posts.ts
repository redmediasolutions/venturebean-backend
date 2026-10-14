"use client";

import { useCallback, useEffect, useState } from "react";

import { postsQuery } from "../repository/post-repository";
import type { Post } from "../types";

/**
 * Loads posts through the authenticated Next.js API.
 *
 * Authentication is handled by the HTTP-only session cookie.
 * No Firebase Client SDK or Firestore subscription is required.
 */
export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch the latest posts.
   */
  const refreshPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result: Post[] = await postsQuery();

      setPosts(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load posts.";

      console.error("Failed to fetch posts:", err);

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch posts when the hook mounts.
   */
  useEffect(() => {
    void refreshPosts();
  }, [refreshPosts]);

  return {
    posts,
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