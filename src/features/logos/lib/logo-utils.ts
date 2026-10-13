/** The category that holds all logos. The website looks for this slug. */
export const LOGOS_ROOT = { name: "Clients", slug: "clients" };

/** Custom field names — the website reads these (see the Astro site's src/lib/clients.ts). */
export const LOGO_FIELDS = {
  order: "display_order",
  size: "logo_size",
  hideOnHome: "hide_on_home",
  hideOnClientsPage: "hide_on_clients_page",
} as const;

export const DEFAULT_LOGO_SIZE = 60;

/** "acme_corp-logo-2x.png" → "Acme Corp" */
export function nameFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  const words = base
    .split(/[-_\s.]+/)
    .filter((w) => w && !/^(logo|final|new|copy|hd|scaled|\d+x\d*|\d+px|svg|vector)$/i.test(w));
  if (!words.length) return base;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
