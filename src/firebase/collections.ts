/**
 * Names of every Firestore collection used by the CMS.
 * Your Astro website reads from the same collections.
 */
export const COLLECTIONS = {
  posts: "posts",
  categories: "categories",
  fieldGroups: "fieldGroups",
  media: "media",
  settings: "settings",
  admins: "admins",
} as const;

/** Folder inside Firebase Storage where uploaded files are kept. */
export const MEDIA_FOLDER = "media";
