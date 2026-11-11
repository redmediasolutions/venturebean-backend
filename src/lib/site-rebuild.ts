import "server-only";

/**
 * Rebuild the public website after content changes.
 *
 * The website is a static Astro site on Cloudflare: it reads the Content
 * Manager while it is BUILT. So after a post (or category) is saved or deleted
 * we call the Cloudflare deploy hook, and the site rebuilds itself
 * (about 1–2 minutes).
 *
 * Set CLOUDFLARE_DEPLOY_HOOK_URL in .env.local (Cloudflare → venturebean-astro
 * → Settings → Builds → Deploy Hooks → Add). Without it nothing happens.
 *
 * Several saves close together (e.g. reordering logos) start one extra build
 * at most once a minute instead of one build per save.
 */
const WINDOW_MS = 60_000;
let lastSent = 0;
let trailing: ReturnType<typeof setTimeout> | null = null;

async function send(url: string, reason: string) {
  try {
    const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) console.error(`[site rebuild] Cloudflare answered ${res.status} (${reason})`);
    else console.info(`[site rebuild] started (${reason})`);
  } catch (error) {
    console.error(`[site rebuild] could not reach Cloudflare (${reason}):`, error instanceof Error ? error.message : error);
  }
}

export async function requestSiteRebuild(reason: string): Promise<void> {
  const url = process.env.CLOUDFLARE_DEPLOY_HOOK_URL?.trim();
  if (!url) return;
  const now = Date.now();
  if (now - lastSent >= WINDOW_MS && !trailing) {
    lastSent = now;
    await send(url, reason);
    return;
  }
  // A build was just started: queue one more for when the minute is up, so
  // this change is included too.
  if (!trailing) {
    trailing = setTimeout(() => {
      trailing = null;
      lastSent = Date.now();
      void send(url, "more changes");
    }, Math.max(WINDOW_MS - (now - lastSent), 5_000));
  }
}

/** Only changes the public site can show need a rebuild (not draft-only edits). */
export function affectsWebsite(...statuses: unknown[]): boolean {
  return statuses.some((s) => s === "published");
}
