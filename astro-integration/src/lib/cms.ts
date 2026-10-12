/**
 * Helpers to read content from the CMS inside your Astro website.
 *
 *   const posts = await getPosts({ category: "blog" });
 *   const post  = await getPostBySlug("my-first-post");
 *   post.customFields.event_date   // ← your custom fields (like ACF's get_field)
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitTo,
  orderBy,
  query,
  Timestamp,
  where,
  type DocumentData,
} from "firebase/firestore/lite";
import { db } from "./firebase";

// ---------- Types (match the admin panel) ----------
export interface MediaRef {
  url: string;
  name: string;
  alt: string;
  width?: number | null;
  height?: number | null;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string; // HTML — render with <Fragment set:html={post.content} />
  excerpt: string;
  featuredImage: MediaRef | null;
  categorySlugs: string[];
  publishedAt: Date | null;
  updatedAt: Date | null;
  seoTitle: string;
  seoDescription: string;
  authorName: string;
  /** Your custom fields, keyed by field name. */
  customFields: Record<string, any>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
}

const toDate = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

function toPost(id: string, d: DocumentData): Post {
  return {
    id,
    title: d.title ?? "",
    slug: d.slug ?? "",
    content: d.content ?? "",
    excerpt: d.excerpt ?? "",
    featuredImage: d.featuredImage ?? null,
    categorySlugs: d.categorySlugs ?? [],
    publishedAt: toDate(d.publishedAt),
    updatedAt: toDate(d.updatedAt),
    seoTitle: d.seoTitle || d.title || "",
    seoDescription: d.seoDescription || d.excerpt || "",
    authorName: d.authorName ?? "",
    customFields: d.customFields ?? {},
  };
}

// ---------- Posts ----------

/**
 * Published posts, newest first.
 * @param category  a category SLUG, e.g. "blog" or "news" (optional)
 * @param limit     max number of posts (optional)
 */
export async function getPosts(options: { category?: string; limit?: number } = {}): Promise<Post[]> {
  const constraints = [
    where("status", "==", "published"),
    where("publishedAt", "<=", Timestamp.now()), // hides scheduled (future) posts
    ...(options.category ? [where("categorySlugs", "array-contains", options.category)] : []),
    orderBy("publishedAt", "desc"),
    ...(options.limit ? [limitTo(options.limit)] : []),
  ];
  const snap = await getDocs(query(collection(db, "posts"), ...constraints));
  return snap.docs.map((d) => toPost(d.id, d.data()));
}

/** One published post by its slug (or null if not found). */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const snap = await getDocs(
    query(collection(db, "posts"), where("status", "==", "published"), where("slug", "==", slug), limitTo(1))
  );
  const d = snap.docs[0];
  if (!d) return null;
  const post = toPost(d.id, d.data());
  if (post.publishedAt && post.publishedAt > new Date()) return null; // scheduled
  return post;
}

// ---------- Categories ----------

export async function getCategories(): Promise<Category[]> {
  const snap = await getDocs(query(collection(db, "categories"), orderBy("name")));
  return snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name ?? "",
    slug: d.data().slug ?? "",
    description: d.data().description ?? "",
    parentId: d.data().parentId ?? null,
  }));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const all = await getCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

// ---------- Site settings ----------

export async function getSiteSettings() {
  const snap = await getDoc(doc(db, "settings", "general"));
  return (snap.data() ?? {}) as { siteName?: string; siteUrl?: string };
}
