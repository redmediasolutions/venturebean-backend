import type { MediaRef } from "@/features/media/types";
import type { CustomFieldValues } from "@/features/custom-fields/types";

export type PostStatus = "draft" | "published";

/**
 * A post (blog article, news item, event… — separated by category).
 * This is exactly what is stored in Firestore → "posts" collection.
 */
export interface Post {
  id: string;
  title: string;
  slug: string;

  /** The main content, as HTML. */
  content: string;

  /** Short summary shown on listing pages. */
  excerpt: string;

  featuredImage: MediaRef | null;

  categoryIds: string[];

  /** Copy of the category slugs — lets your Astro site filter by slug easily. */
  categorySlugs: string[];

  status: PostStatus;

  /** Original publication date; null for drafts. */
  publishedAt: Date | null;

  seoTitle: string;
  seoDescription: string;

  /** ACF-style custom field values, keyed by field name. */
  customFields: CustomFieldValues;

  authorId: string;
  authorName: string;

  /** WordPress post ID, when the post was imported from WordPress (used to skip duplicates). */
  wordpressId?: number | null;

  /** Original creation date. */
  createdAt: Date | null;

  /** Last modification date. */
  updatedAt: Date | null;
}

/**
 * Input used to create or update a post.
 *
 * createdAt and updatedAt are optional so imports can preserve
 * original WordPress timestamps without requiring them for normal posts.
 */
export type PostInput = Omit<
  Post,
  "id" | "createdAt" | "updatedAt" | "categorySlugs"
> & {
  createdAt?: Date | null;
  updatedAt?: Date | null;
};