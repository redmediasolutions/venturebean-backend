/** "Hello World!" → "hello-world" (used for post/category URLs). */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "Hero Title" → "hero_title" (used for custom field names, like ACF). */
export function toFieldName(text: string): string {
  return slugify(text.replace(/_/g, " ")).replace(/-/g, "_");
}
