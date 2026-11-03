/**
 * Report downloads — someone on the website entered their email under
 * "Download the full analysis" on an Industry Perspectives article.
 */
export interface ReportDownload {
  id: string;
  email: string;
  /** Content Manager ID of the article (post). */
  postId: string;
  postSlug: string;
  /** Article title at the time of the download. */
  postTitle: string;
  /** Page the download was made from. */
  pageUrl: string;
  createdAt: Date | null;
}

/** One report in the filter, with how many times it was downloaded. */
export interface ReportOption {
  slug: string;
  title: string;
  count: number;
}
