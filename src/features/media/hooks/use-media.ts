"use client";

import { useApiResource } from "@/hooks/use-api-resource";
import { fetchMedia, MEDIA_KEY } from "../repository/media-repository";
import type { MediaItem } from "../types";

const EMPTY: MediaItem[] = [];

/** Everything in the Media Library (newest first). Refreshes after uploads. */
export function useMedia() {
  const { data, loading, error } = useApiResource(MEDIA_KEY, fetchMedia, EMPTY);
  return { media: data, loading, error };
}
