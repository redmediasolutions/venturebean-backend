"use client";

import { useCollection } from "@/hooks/use-collection";
import { mapMedia, mediaQuery } from "../repository/media-repository";

/** Live list of everything in the Media Library (newest first). */
export function useMedia() {
  const { data, loading, error } = useCollection(mediaQuery, mapMedia);
  return { media: data, loading, error };
}
