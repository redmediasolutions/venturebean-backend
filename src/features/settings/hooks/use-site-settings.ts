"use client";

import { useApiResource } from "@/hooks/use-api-resource";
import { DEFAULT_SETTINGS, type SiteSettings } from "../types";
import { fetchSettings, SETTINGS_KEY } from "../repository/settings-repository";

/** Website settings (name, address, post URL pattern). */
export function useSiteSettings() {
  const { data, loading } = useApiResource<SiteSettings>(SETTINGS_KEY, fetchSettings, DEFAULT_SETTINGS);
  return { settings: data, loading };
}

/** Build the public URL of a post on the live website (or null if not set up). */
export function buildPostUrl(settings: SiteSettings, slug: string): string | null {
  if (!settings.siteUrl) return null;
  const path = (settings.postUrlPattern || "/blog/{slug}").replace("{slug}", slug);
  return settings.siteUrl.replace(/\/+$/, "") + (path.startsWith("/") ? path : `/${path}`);
}
