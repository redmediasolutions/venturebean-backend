/**
 * Importing posts from the VentureBean WordPress site.
 *
 * Single post:  importWordPressPost(...)
 * Whole category: fetchWordPressCategoryPosts(...) → importWordPressPost(...) for each
 *
 * The server route /api/wordpress/import downloads the article and copies its
 * images to S3; this file turns the result into a post and saves it.
 */
import type { User } from "firebase/auth";
import type { Category } from "@/features/categories/types";
import { savePost } from "../services/post-service";
import type { Post, PostInput } from "../types";

export type ImportMode = "full" | "summary";

export interface ImportedWordPressPost {
  id: number;
  title: string;
  slug: string;
  url: string;
  excerpt: string;
  contentHtml: string;
  featuredImage: string | null;
  createdAt: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  status: string;
}

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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Read a JSON API response, turning errors into readable messages. */
async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const text = await response.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    console.error("WordPress import API returned a non-JSON response:", {
      status: response.status,
      body: text.slice(0, 2000),
    });
  }
  if (!response.ok) {
    const message = (data?.error as string) || (data?.message as string) || text || fallback;
    throw new Error(`${message} (${response.status})`);
  }
  return data as T;
}

/* ---------------------------------------------------------------- WordPress → CMS */

/** Ask the server to fetch one WordPress post (and copy its images to S3). */
export async function requestWordPressPost(postId: number, mode: ImportMode): Promise<ImportedWordPressPost> {
  const response = await fetch("/api/wordpress/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ postId, mode }),
    cache: "no-store",
  });
  const result = await readJson<{ success?: boolean; post?: ImportedWordPressPost; error?: string; details?: string }>(
    response,
    "Failed to import WordPress post."
  );
  if (!result?.success || !result.post) {
    throw new Error(result?.details || result?.error || "The WordPress import did not return an article.");
  }
  if (!result.post.title?.trim()) throw new Error("The imported WordPress article does not have a title.");
  if (!result.post.contentHtml?.trim()) throw new Error("The imported article does not contain any content.");
  return result.post;
}

/** Turn the imported article into a post (keeps the original status and dates). */
export function toPostInput(imported: ImportedWordPressPost, categoryId: string, user: Pick<User, "uid" | "displayName" | "email">): PostInput {
  const featuredImage = imported.featuredImage
    ? ({ url: imported.featuredImage, alt: imported.title.trim() } as NonNullable<PostInput["featuredImage"]>)
    : null;

  const status: PostInput["status"] = imported.status === "publish" ? "published" : "draft";

  return {
    title: imported.title.trim(),
    slug: slugify(imported.slug || imported.title),
    content: imported.contentHtml,
    excerpt: imported.excerpt?.trim() ?? "",
    featuredImage,
    categoryIds: [categoryId],
    status,
    publishedAt: status === "published" && imported.publishedAt ? new Date(imported.publishedAt) : null,
    seoTitle: imported.title.trim(),
    seoDescription: imported.excerpt?.trim() ?? "",
    customFields: {},
    authorId: user.uid,
    authorName: user.displayName || user.email || "VentureBean Admin",
    wordpressId: imported.id,
    createdAt: imported.createdAt ? new Date(imported.createdAt) : null,
    updatedAt: imported.updatedAt ? new Date(imported.updatedAt) : null,
  };
}

/** Import one WordPress post into a category. */
export async function importWordPressPost(options: {
  postId: number;
  mode: ImportMode;
  categoryId: string;
  user: Pick<User, "uid" | "displayName" | "email">;
  categories: Category[];
}) {
  const imported = await requestWordPressPost(options.postId, options.mode);
  const input = toPostInput(imported, options.categoryId, options.user);
  const saved = await savePost(input, options.categories);
  return { ...saved, title: input.title, status: input.status };
}

/* ---------------------------------------------------------------- Bulk */

export async function fetchWordPressCategories(): Promise<WordPressCategory[]> {
  const response = await fetch("/api/wordpress/categories", { credentials: "same-origin", cache: "no-store" });
  const data = await readJson<{ categories: WordPressCategory[] }>(response, "Could not load WordPress categories.");
  return data.categories ?? [];
}

export async function fetchWordPressCategoryPosts(categoryId: number) {
  const response = await fetch(`/api/wordpress/category-posts?categoryId=${categoryId}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  return readJson<{ category: WordPressCategory; posts: WordPressPostSummary[] }>(response, "Could not load posts from WordPress.");
}

/**
 * Has this WordPress post already been imported?
 * Matches on the stored WordPress ID, or on the slug for posts imported
 * before the ID was recorded.
 */
export function findExistingImport(posts: Post[], wp: Pick<WordPressPostSummary, "id" | "slug">): Post | undefined {
  return (
    posts.find((p) => p.wordpressId === wp.id) ??
    posts.find((p) => !p.wordpressId && Boolean(wp.slug) && p.slug === slugify(wp.slug))
  );
}
