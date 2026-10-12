/** A file in the Media Library. */
export interface MediaItem {
  id: string;
  name: string;
  url: string;
  /** Where the file lives inside Firebase Storage. */
  path: string;
  contentType: string;
  size: number;
  alt: string;
  width: number | null;
  height: number | null;
  createdAt: Date | null;
}

/**
 * What gets saved on a post when you pick an image or file
 * (featured image, image field, gallery field, file field).
 */
export interface MediaRef {
  id?: string;
  url: string;
  path: string;
  name: string;
  alt: string;
  contentType?: string;
  width?: number | null;
  height?: number | null;
}

export type MediaKind = "image" | "any";
