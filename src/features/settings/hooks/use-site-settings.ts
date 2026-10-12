"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type SiteSettings } from "../types";
import { subscribeToSettings } from "../repository/settings-repository";

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeToSettings(
      (s) => {
        setSettings(s);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  return { settings, loading };
}

/** Build the public URL of a post on the live website (or null if not set up). */
export function buildPostUrl(settings: SiteSettings, slug: string): string | null {
  if (!settings.siteUrl) return null;
  const path = (settings.postUrlPattern || "/blog/{slug}").replace("{slug}", slug);
  return settings.siteUrl.replace(/\/+$/, "") + (path.startsWith("/") ? path : `/${path}`);
}
