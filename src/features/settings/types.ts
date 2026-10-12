export interface SiteSettings {
  /** Shown in the sidebar of the admin panel. */
  siteName: string;
  /** Your live Astro website, e.g. https://example.com — used for "View website" links. */
  siteUrl: string;
  /** Optional: how post URLs look on your site, e.g. /blog/{slug} */
  postUrlPattern: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "",
  siteUrl: "",
  postUrlPattern: "/blog/{slug}",
};
