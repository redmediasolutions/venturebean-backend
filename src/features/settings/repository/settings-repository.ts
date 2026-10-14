/** Website settings — read and saved through /api/settings. */
import { apiGet, apiPut } from "@/lib/api-client";
import { invalidate } from "@/hooks/use-api-resource";
import { DEFAULT_SETTINGS, type SiteSettings } from "../types";

export const SETTINGS_KEY = "settings";

export async function fetchSettings(): Promise<SiteSettings> {
  const { settings } = await apiGet<{ settings: Partial<SiteSettings> }>("/api/settings");
  return { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
}

export async function saveSettings(settings: SiteSettings) {
  await apiPut("/api/settings", settings);
  invalidate(SETTINGS_KEY);
}
