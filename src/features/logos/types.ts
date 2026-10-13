import type { MediaRef } from "@/features/media/types";
import type { Post } from "@/features/posts/types";

/**
 * A client logo. Stored as a post in the "Clients" category (so the website
 * can read it), with the logo as its featured image.
 */
export interface Logo {
  id: string;
  name: string;
  image: MediaRef | null;
  /** Group (sub-category of Clients), e.g. Manufacturing. null = no group. */
  groupId: string | null;
  /** Lower shows first. */
  order: number | null;
  /** Width of the logo in its box, %. null = normal (60). */
  size: number | null;
  onHome: boolean;
  onClientsPage: boolean;
  /** Drafts are hidden from the website. */
  published: boolean;
  /** The underlying post (used when saving). */
  post: Post;
}

export interface LogoGroup {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface LogoInput {
  name: string;
  image: MediaRef | null;
  groupId: string | null;
  order: number | null;
  size: number | null;
  onHome: boolean;
  onClientsPage: boolean;
  published: boolean;
}
