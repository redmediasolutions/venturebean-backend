import "server-only";

/**
 * Small helpers for reading the VentureBean WordPress REST API.
 * Used by the bulk-import routes (the single-post import lives in
 * app/api/wordpress/import/route.ts).
 */
export const WORDPRESS_API = "https://venturebean.com/wp-json/wp/v2";

/** WordPress returns at most 100 items per page. */
const PER_PAGE = 100;
/** Safety limit so a typo can't start an endless import. */
export const MAX_POSTS_PER_CATEGORY = 1000;

export interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent: number;
}

export interface WordPressPostSummary {
  id: number;
  slug: string;
  title: string;
  date: string | null;
  link: string;
}

export function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function wpFetch(path: string): Promise<Response> {
  const response = await fetch(`${WORDPRESS_API}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": "VentureBean-WordPress-Importer/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  return response;
}

/** Fetch every page of a list endpoint (WordPress paginates at 100). */
async function fetchAllPages<T>(path: string, limit: number): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; items.length < limit; page++) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await wpFetch(`${path}${separator}per_page=${PER_PAGE}&page=${page}`);

    // Asking for a page past the end returns 400 "rest_post_invalid_page_number".
    if (response.status === 400 && page > 1) break;
    if (!response.ok) {
      throw new Error(`WordPress returned ${response.status} for ${path}.`);
    }

    const batch = (await response.json()) as T[];
    items.push(...batch);

    const totalPages = Number(response.headers.get("x-wp-totalpages") || 0);
    if (batch.length < PER_PAGE || (totalPages && page >= totalPages)) break;
  }
  return items.slice(0, limit);
}

export async function listWordPressCategories(): Promise<WordPressCategory[]> {
  const raw = await fetchAllPages<{ id: number; name: string; slug: string; count: number; parent: number }>(
    "/categories?_fields=id,name,slug,count,parent&orderby=name&order=asc",
    500
  );
  return raw.map((c) => ({ id: c.id, name: decodeHtml(c.name), slug: c.slug, count: c.count, parent: c.parent }));
}

export async function getWordPressCategory(id: number): Promise<WordPressCategory | null> {
  const response = await wpFetch(`/categories/${id}?_fields=id,name,slug,count,parent`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`WordPress returned ${response.status} for category ${id}.`);
  const c = (await response.json()) as WordPressCategory;
  return { ...c, name: decodeHtml(c.name) };
}

/** All published posts in a WordPress category, newest first. */
export async function listWordPressPostsInCategory(categoryId: number): Promise<WordPressPostSummary[]> {
  const raw = await fetchAllPages<{ id: number; slug: string; title?: { rendered?: string }; date?: string; link?: string }>(
    `/posts?categories=${categoryId}&status=publish&orderby=date&order=desc&_fields=id,slug,title,date,link`,
    MAX_POSTS_PER_CATEGORY
  );
  return raw.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: decodeHtml(p.title?.rendered ?? "") || `(untitled #${p.id})`,
    date: p.date ?? null,
    link: p.link ?? "",
  }));
}

export function parsePositiveInt(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
