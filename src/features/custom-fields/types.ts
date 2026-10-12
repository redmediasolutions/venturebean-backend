/**
 * Custom Fields work like the ACF plugin in WordPress:
 *  - A "Field Group" is a box of extra fields (e.g. "Event details").
 *  - You choose which posts show the box (all posts, or posts in certain categories).
 *  - Values are saved on each post under  post.customFields.<field name>
 */
export type FieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "email"
  | "url"
  | "date"
  | "select"
  | "toggle"
  | "image"
  | "gallery"
  | "file";

export interface CustomField {
  id: string;
  /** Shown to the person editing the post, e.g. "Event Date". */
  label: string;
  /** Used in code on your Astro site, e.g. "event_date". */
  name: string;
  type: FieldType;
  required: boolean;
  /** Small help text shown under the field. */
  instructions: string;
  placeholder: string;
  /** Choices for the "select" type. */
  options: string[];
}

export type LocationRule = "all" | "categories";

export interface FieldGroup {
  id: string;
  title: string;
  description: string;
  /** "all" = show on every post, "categories" = only posts in the chosen categories. */
  location: LocationRule;
  categoryIds: string[];
  fields: CustomField[];
  active: boolean;
  /** Lower numbers appear first on the post screen. */
  order: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type FieldGroupInput = Omit<FieldGroup, "id" | "createdAt" | "updatedAt">;

/** Values stored on a post, keyed by field name. */
export type CustomFieldValues = Record<string, unknown>;
