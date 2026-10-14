export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  /** Parent category id (for sub-categories), or null for a top-level category. */
  parentId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type CategoryInput = Pick<Category, "name" | "slug" | "description" | "parentId">;
