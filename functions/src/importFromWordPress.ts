import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {load} from "cheerio";
import type {AnyNode, Element} from "domhandler";

/* ---------------- FIREBASE ---------------- */
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

/* ---------------- TYPES ---------------- */
interface RichText {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  code: boolean;
  href: string | null;
}

interface NormalizedBlock {
  type: "heading" | "paragraph" | "quote" | "list_item" | "image";
  level?: 1 | 2 | 3;
  ordered?: boolean;
  content?: RichText[];
  url?: string;
}

type ImportMode = "full" | "summary";

interface WordPressPost {
  id: number;
  date: string;
  modified: string;
  slug: string;
  status: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  featured_media: number;
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url?: string;
      alt_text?: string;
    }>;
  };
}

interface FormattingState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  code: boolean;
  href: string | null;
}

/* ---------------- WORDPRESS CONFIG ---------------- */
// Only accept URLs belonging to the VentureBean website.
const ALLOWED_HOSTS = new Set([
  "venturebean.com",
  "www.venturebean.com",
]);

const WORDPRESS_API = "https://venturebean.com/wp-json/wp/v2";

/* ---------------- RICH TEXT ---------------- */
/**
 * Returns the default formatting state for rich-text fragments.
 * @return {FormattingState} Default formatting state.
 */
function defaultFormatting(): FormattingState {
  return {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    href: null,
  };
}

/**
 * Creates a rich-text fragment using the supplied formatting state.
 * @param {string} text Text content for the fragment.
 * @param {FormattingState} state Formatting flags to apply.
 * @return {RichText} The formatted rich-text fragment.
 */
function createRichText(
  text: string,
  state: FormattingState
): RichText {
  return {
    text,
    bold: state.bold,
    italic: state.italic,
    underline: state.underline,
    strikethrough: state.strikethrough,
    code: state.code,
    href: state.href,
  };
}

/**
 * Merges adjacent rich-text fragments that share the same formatting.
 * @param {RichText[]} fragments Rich-text fragments to merge.
 * @return {RichText[]} Merged rich-text fragments.
 */
function mergeRichText(fragments: RichText[]): RichText[] {
  const result: RichText[] = [];
  for (const fragment of fragments) {
    if (!fragment.text) {
      continue;
    }
    const previous = result[result.length - 1];
    if (
      previous &&
      previous.bold === fragment.bold &&
      previous.italic === fragment.italic &&
      previous.underline === fragment.underline &&
      previous.strikethrough === fragment.strikethrough &&
      previous.code === fragment.code &&
      previous.href === fragment.href
    ) {
      previous.text += fragment.text;
    } else {
      result.push({...fragment});
    }
  }
  return result;
}

/**
 * Normalizes whitespace in extracted HTML text.
 * @param {string} text Text to normalize.
 * @return {string} Normalized text.
 */
function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\n]+/g, " ");
}

/**
 * Extracts text fragments and inline formatting from an HTML node.
 * @param {AnyNode} node HTML node to inspect.
 * @param {FormattingState} [state] Formatting inherited from parent nodes.
 * @return {RichText[]} Extracted rich-text fragments.
 */
function extractRichText(
  node: AnyNode,
  state: FormattingState = defaultFormatting()
): RichText[] {
  if (node.type === "text") {
    return [createRichText(node.data, state)];
  }
  if (node.type !== "tag") {
    return [];
  }
  const element = node as Element;
  const tag = element.name.toLowerCase();

  // Ignore executable and embedded content.
  if (
    [
      "script",
      "style",
      "noscript",
      "iframe",
      "object",
      "embed",
      "svg",
      "video",
      "audio",
    ].includes(tag)
  ) {
    return [];
  }

  const nextState = {...state};
  switch (tag) {
  case "strong":
  case "b":
    nextState.bold = true;
    break;
  case "em":
  case "i":
    nextState.italic = true;
    break;
  case "u":
    nextState.underline = true;
    break;
  case "s":
  case "strike":
  case "del":
    nextState.strikethrough = true;
    break;
  case "code":
  case "kbd":
  case "samp":
    nextState.code = true;
    break;
  case "a": {
    const href = element.attribs?.href;
    if (
      href &&
        /^(https?:\/\/|mailto:)/i.test(href.trim())
    ) {
      nextState.href = href.trim();
    }
    break;
  }
  }

  const fragments: RichText[] = [];
  for (const child of element.children || []) {
    fragments.push(...extractRichText(child, nextState));
  }
  return mergeRichText(fragments);
}

/**
 * Normalizes and merges extracted rich-text fragments.
 * @param {RichText[]} fragments Fragments to normalize.
 * @return {RichText[]} Normalized fragments.
 */
function normalizeFragments(
  fragments: RichText[]
): RichText[] {
  return mergeRichText(
    fragments.map((fragment) => ({
      ...fragment,
      text: normalizeText(fragment.text),
    }))
  );
}

/**
 * Checks whether fragments contain non-whitespace text.
 * @param {RichText[]} fragments Rich-text fragments to inspect.
 * @return {boolean} Whether any fragment contains visible text.
 */
function hasText(fragments: RichText[]): boolean {
  return fragments.some((fragment) => fragment.text.trim().length > 0);
}

/* ---------------- HTML NORMALIZER ---------------- */
/**
 * Resolves an image element's source to an absolute HTTP(S) URL.
 * @param {Element} element HTML image element.
 * @return {string | null} Absolute image URL, or null when unavailable
 *     or invalid.
 */
function extractImageUrl(element: Element): string | null {
  const src =
    element.attribs?.src ||
    element.attribs?.["data-src"] ||
    element.attribs?.["data-lazy-src"];
  if (!src) {
    return null;
  }
  try {
    const url = new URL(src, "https://venturebean.com");
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Converts a list element and its nested lists into normalized blocks.
 * @param {Element} element List element to normalize.
 * @param {NormalizedBlock[]} output Destination array for normalized blocks.
 * @param {boolean} ordered Whether the current list is ordered.
 * @return {void}
 */
function normalizeList(
  element: Element,
  output: NormalizedBlock[],
  ordered: boolean
): void {
  for (const child of element.children || []) {
    if (child.type !== "tag") {
      continue;
    }
    const li = child as Element;
    if (li.name.toLowerCase() !== "li") {
      continue;
    }
    const fragments: RichText[] = [];
    for (const item of li.children || []) {
      if (
        item.type === "tag" &&
        ["ul", "ol"].includes(
          (item as Element).name.toLowerCase()
        )
      ) {
        continue;
      }
      fragments.push(...extractRichText(item));
    }
    const content = normalizeFragments(fragments);
    if (hasText(content)) {
      output.push({
        type: "list_item",
        ordered,
        content,
      });
    }

    // Preserve nested lists as individual list items.
    for (const item of li.children || []) {
      if (item.type !== "tag") {
        continue;
      }
      const nested = item as Element;
      const nestedTag = nested.name.toLowerCase();
      if (nestedTag === "ul" || nestedTag === "ol") {
        normalizeList(nested, output, nestedTag === "ol");
      }
    }
  }
}

/**
 * Converts WordPress HTML into the app's normalized content-block schema.
 * @param {string} html HTML content from WordPress.
 * @return {NormalizedBlock[]} Normalized content blocks.
 */
function normalizeHtml(html: string): NormalizedBlock[] {
  if (!html?.trim()) {
    return [];
  }
  const $ = load(html);
  const output: NormalizedBlock[] = [];

  /**
   * Processes one HTML node and appends its normalized blocks.
   * @param {AnyNode} node HTML node to process.
   * @return {void}
   */
  function processNode(node: AnyNode): void {
    if (node.type === "text") {
      const text = normalizeText(node.data);
      if (text.trim()) {
        output.push({
          type: "paragraph",
          content: [
            createRichText(text, defaultFormatting()),
          ],
        });
      }
      return;
    }
    if (node.type !== "tag") {
      return;
    }
    const element = node as Element;
    const tag = element.name.toLowerCase();
    if (
      [
        "script",
        "style",
        "noscript",
        "iframe",
        "object",
        "embed",
        "svg",
        "head",
        "meta",
        "link",
      ].includes(tag)
    ) {
      return;
    }

    // Headings.
    if (["h1", "h2", "h3"].includes(tag)) {
      const content = normalizeFragments(
        extractRichText(element)
      );
      if (hasText(content)) {
        output.push({
          type: "heading",
          level: Number(tag.substring(1)) as 1 | 2 | 3,
          content,
        });
      }
      return;
    }

    // Paragraphs.
    if (tag === "p") {
      const content = normalizeFragments(
        extractRichText(element)
      );
      if (hasText(content)) {
        output.push({
          type: "paragraph",
          content,
        });
      }
      // Preserve images inside paragraphs.
      for (const child of element.children || []) {
        if (
          child.type === "tag" &&
          (child as Element).name.toLowerCase() === "img"
        ) {
          processNode(child);
        }
      }
      return;
    }

    // Quotations.
    if (tag === "blockquote") {
      const content = normalizeFragments(
        extractRichText(element)
      );
      if (hasText(content)) {
        output.push({
          type: "quote",
          content,
        });
      }
      return;
    }

    // Lists.
    if (tag === "ul" || tag === "ol") {
      normalizeList(element, output, tag === "ol");
      return;
    }

    // Images.
    if (tag === "img") {
      const url = extractImageUrl(element);
      if (url) {
        output.push({
          type: "image",
          url,
        });
      }
      return;
    }

    // Tables are processed as paragraphs.
    if (tag === "table") {
      for (const row of $(element).find("tr").toArray()) {
        const cells = $(row)
          .find("th, td")
          .toArray()
          .map((cell) => $(cell).text().trim())
          .filter(Boolean);
        if (cells.length) {
          output.push({
            type: "paragraph",
            content: [
              createRichText(
                cells.join(" | "),
                defaultFormatting()
              ),
            ],
          });
        }
      }
      return;
    }

    // Process children of wrappers such as div, figure and section.
    for (const child of element.children || []) {
      processNode(child);
    }
  }

  for (const child of $.root().contents().toArray()) {
    processNode(child);
  }
  return output;
}

/**
 * Fetches a published WordPress post using its numeric post ID.
 *
 * @param {number} postId WordPress post ID.
 * @return {Promise<WordPressPost>} Matching WordPress post.
 */
async function fetchWordPressPost(
  postId: number
): Promise<WordPressPost> {
  if (!Number.isInteger(postId) || postId <= 0) {
    throw new HttpsError(
      "invalid-argument",
      "A valid positive WordPress post ID is required."
    );
  }

  const apiUrl = new URL(`${WORDPRESS_API}/posts/${postId}`);
  apiUrl.searchParams.set("_embed", "1");

  const response = await fetch(apiUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (response.status === 404) {
    throw new HttpsError(
      "not-found",
      `No WordPress post found with ID ${postId}.`
    );
  }

  if (!response.ok) {
    console.error("WordPress API request failed.", {
      status: response.status,
      postId,
    });

    throw new HttpsError(
      "unavailable",
      `WordPress API returned status ${response.status}.`
    );
  }

  const post = (await response.json()) as WordPressPost;

  if (!post || post.id !== postId) {
    throw new HttpsError(
      "not-found",
      `No WordPress post found with ID ${postId}.`
    );
  }

  if (post.status !== "publish") {
    throw new HttpsError(
      "failed-precondition",
      "Only published WordPress posts can be imported."
    );
  }

  // Verify that the resolved post belongs to VentureBean.
  const resolvedUrl = new URL(post.link);

  if (
    resolvedUrl.protocol !== "https:" ||
    !ALLOWED_HOSTS.has(resolvedUrl.hostname.toLowerCase())
  ) {
    throw new HttpsError(
      "failed-precondition",
      "The resolved post does not belong to venturebean.com."
    );
  }

  return post;
}

/* ---------------- CLOUD FUNCTION ---------------- */
/**
 * Imports a WordPress post into the existing VentureBean
 * Firestore article structure.
 */
export const importFromWordPress = onCall(
  {
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication required."
      );
    }
    const {articleId, postId, mode} = request.data as {
  articleId?: string;
  postId?: number;
  mode?: ImportMode;
};

    if (
      typeof articleId !== "string" ||
  !articleId.trim() ||
  typeof postId !== "number" ||
  !Number.isInteger(postId) ||
  postId <= 0 ||
  !["full", "summary"].includes(mode || "")
    ) {
      throw new HttpsError(
        "invalid-argument",
        "articleId, a valid numeric postId, and a valid mode " +
          "(full or summary) are required."
      );
    }

    try {
      const articleRef = db
        .collection("Articles")
        .doc(articleId);
      const articleSnapshot = await articleRef.get();
      if (!articleSnapshot.exists) {
        throw new HttpsError(
          "not-found",
          "The target Firestore article does not exist."
        );
      }

      const post = await fetchWordPressPost(postId);

      // Full mode imports post body; summary imports excerpt.
      const html =
        mode === "full" ? post.content.rendered : post.excerpt.rendered;
      const normalizedBlocks = normalizeHtml(html || "");
      const featuredImage =
        post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;

      const rawBlocks = [
        {
          type: "wordpress_post",
          post_id: post.id,
          title: post.title.rendered,
          slug: post.slug,
          link: post.link,
          date: post.date,
          modified: post.modified,
          featured_media: post.featured_media,
          featured_image: featuredImage,
          html: html || "",
        },
      ];

      await articleRef.update({
        [`content.${mode}`]: {
          source: "wordpress",
          post_id: post.id,
          post_url: post.link,
          imported_at: admin.firestore.FieldValue.serverTimestamp(),
          raw_blocks: rawBlocks,
          normalized_blocks: normalizedBlocks,
        },
        wordpress: {
          post_id: post.id,
          post_url: post.link,
          title: post.title.rendered,
          slug: post.slug,
          published_at: post.date,
          modified_at: post.modified,
          featured_image: featuredImage,
        },
        last_updated_at: admin.firestore.FieldValue.serverTimestamp(),
        update_count: admin.firestore.FieldValue.increment(1),
      });

      console.log("WordPress import successful.", {
        articleId,
        postId: post.id,
        mode,
        blocks: normalizedBlocks.length,
        uid: request.auth.uid,
      });

      return {
        success: true,
        articleId,
        post_id: post.id,
        post_url: post.link,
        mode,
        source: "wordpress",
        normalized_blocks: normalizedBlocks.length,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("WordPress import failed.", {
        articleId,
        mode,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new HttpsError(
        "internal",
        "Failed to import WordPress content."
      );
    }
  }
);
