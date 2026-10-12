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

/**
 * settings/setup is created when the first account (the owner) signs up.
 * Once it exists, new sign-ups no longer get admin access automatically.
 */
export const SETUP_DOC_ID = "setup";

/** Folder inside Firebase Storage where uploaded files are kept. */
export const MEDIA_FOLDER = "media";
