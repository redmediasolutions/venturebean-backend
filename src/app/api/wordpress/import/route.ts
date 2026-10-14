import { NextRequest, NextResponse } from "next/server";
import { adminDb, serverAuth } from "@/firebase/admin";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORDPRESS_API = "https://venturebean.com/wp-json/wp/v2";
const WORDPRESS_HOSTS = new Set(["venturebean.com", "www.venturebean.com"]);

const S3_BUCKET = process.env.AWS_S3_BUCKET || "redmediaassets";
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_PUBLIC_BASE_URL = (
  process.env.AWS_S3_PUBLIC_BASE_URL ||
  `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`
).replace(/\/+$/, "");

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const SESSION_COOKIE_NAME = "session";

const s3 = new S3Client({
  region: AWS_REGION,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

// ============================================================
// S3 DIAGNOSTICS
// ============================================================

console.info("[S3 Diagnostics] Configuration", {
  region: AWS_REGION,
  bucket: S3_BUCKET,
  publicBaseUrl: S3_PUBLIC_BASE_URL,
  accessKeyConfigured: Boolean(process.env.AWS_ACCESS_KEY_ID),
  secretKeyConfigured: Boolean(process.env.AWS_SECRET_ACCESS_KEY),
  credentialsSource:
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
      ? "environment"
      : "AWS SDK default credential provider chain",
  nodeEnvironment: process.env.NODE_ENV,
});

type ImportMode = "full" | "summary";

interface WordPressRenderedField {
  rendered?: string;
}

interface WordPressMedia {
  source_url?: string;
  alt_text?: string;
  media_details?: {
    sizes?: {
      full?: { source_url?: string };
      large?: { source_url?: string };
    };
  };
}

interface WordPressPost {
  id: number;
date_gmt?: string;
modified?: string;
modified_gmt?: string;
  date?: string | null;
  link?: string;
  slug?: string;
  status?: string;
  title?: WordPressRenderedField;
  excerpt?: WordPressRenderedField;
  content?: WordPressRenderedField;
  _embedded?: {
    "wp:featuredmedia"?: WordPressMedia[];
  };
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status },
  );
}

function stripHtml(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    // Numeric entities WordPress adds to titles, e.g. &#8217; (’) and &#8211; (–).
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&hellip;/gi, "…")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getFileExtension(contentType: string, sourceUrl: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/svg+xml": "svg",
  };

  const mimeType = contentType.split(";")[0].trim().toLowerCase();
  if (extensions[mimeType]) return extensions[mimeType];

  try {
    const extension = new URL(sourceUrl).pathname.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1];
    if (extension) return extension.toLowerCase();
  } catch {
    // Fall through to the default extension.
  }

  return "jpg";
}

function safeFilename(sourceUrl: string): string {
  try {
    const filename = new URL(sourceUrl).pathname.split("/").pop() || "image";
    return filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
  } catch {
    return "image.jpg";
  }
}


async function uploadImageToS3(
  sourceUrl: string,
  postId: number,
): Promise<string | null> {
  let imageLabel = "unknown image";

  try {
    const parsedUrl = new URL(sourceUrl);

    imageLabel = `${parsedUrl.hostname}${parsedUrl.pathname}`;

    console.info("[S3 Upload] Starting", {
      postId,
      source: imageLabel,
    });

    // --------------------------------------------------------
    // STEP 1: VALIDATE SOURCE URL
    // --------------------------------------------------------

    if (
      parsedUrl.protocol !== "https:" ||
      !WORDPRESS_HOSTS.has(parsedUrl.hostname.toLowerCase())
    ) {
      console.warn("[S3 Upload] Skipped: unsupported image URL", {
        postId,
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        allowedHosts: [...WORDPRESS_HOSTS],
      });

      return null;
    }

    // --------------------------------------------------------
    // STEP 2: DOWNLOAD IMAGE FROM WORDPRESS
    // --------------------------------------------------------

    let response: Response;

    try {
      response = await fetch(parsedUrl.toString(), {
        signal: AbortSignal.timeout(20_000),
        headers: {
          "User-Agent": "VentureBean-WordPress-Importer/1.0",
        },
        cache: "no-store",
      });
    } catch (error: unknown) {
      console.error("[S3 Upload] WordPress download failed", {
        postId,
        source: imageLabel,
        error:
          error instanceof Error ? error.message : String(error),
      });

      return null;
    }

    console.info("[S3 Upload] WordPress response", {
      postId,
      source: imageLabel,
      status: response.status,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    });

    if (!response.ok) {
      console.error("[S3 Upload] WordPress returned an HTTP error", {
        postId,
        source: imageLabel,
        status: response.status,
        statusText: response.statusText,
      });

      return null;
    }

    // --------------------------------------------------------
    // STEP 3: DETERMINE IMAGE CONTENT TYPE
    // --------------------------------------------------------

    const responseContentType = (
      response.headers.get("content-type") || ""
    )
      .split(";")[0]
      .trim()
      .toLowerCase();

    const sourceExtension = parsedUrl.pathname
      .split("/")
      .pop()
      ?.split(".")
      .pop()
      ?.toLowerCase();

    const extensionContentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      avif: "image/avif",
      svg: "image/svg+xml",
      bmp: "image/bmp",
      ico: "image/x-icon",
      tif: "image/tiff",
      tiff: "image/tiff",
    };

    const expectedContentType = sourceExtension
      ? extensionContentTypes[sourceExtension]
      : undefined;

    let contentType = responseContentType;

    if (!contentType.startsWith("image/")) {
      if (expectedContentType) {
        console.warn(
          "[S3 Upload] Response content type is incorrect; checking downloaded bytes",
          {
            postId,
            source: imageLabel,
            responseContentType:
              responseContentType || "missing",
            inferredContentType: expectedContentType,
          },
        );

        contentType = expectedContentType;
      } else {
        console.error("[S3 Upload] Unsupported content type", {
          postId,
          source: imageLabel,
          responseContentType:
            responseContentType || "missing",
        });

        return null;
      }
    }

    // --------------------------------------------------------
    // STEP 4: DOWNLOAD AND VALIDATE IMAGE BYTES
    // --------------------------------------------------------

    const contentLength = Number(
      response.headers.get("content-length") || 0,
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_IMAGE_BYTES
    ) {
      console.error("[S3 Upload] Image exceeds size limit", {
        postId,
        source: imageLabel,
        contentLength,
        maxBytes: MAX_IMAGE_BYTES,
      });

      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length === 0) {
      console.error("[S3 Upload] Downloaded file is empty", {
        postId,
        source: imageLabel,
      });

      return null;
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
      console.error("[S3 Upload] Image exceeds size limit", {
        postId,
        source: imageLabel,
        actualBytes: buffer.length,
        maxBytes: MAX_IMAGE_BYTES,
      });

      return null;
    }

    // Check common image signatures so a text or HTML response
    // is not uploaded merely because the URL ends in .avif.
    const hasBytes = (...bytes: number[]) =>
      bytes.every((byte, index) => buffer[index] === byte);

    const isJpeg =
      hasBytes(0xff, 0xd8, 0xff);

    const isPng =
      hasBytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

    const isGif =
      buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
      buffer.subarray(0, 6).toString("ascii") === "GIF89a";

    const isWebp =
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP";

    const isAvif =
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
      /^(avif|avis)$/.test(
        buffer.subarray(8, 12).toString("ascii"),
      );

    const isSvg =
      /^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(
        buffer.toString("utf8", 0, Math.min(buffer.length, 1024)),
      );

    const detectedContentType = isJpeg
      ? "image/jpeg"
      : isPng
        ? "image/png"
        : isGif
          ? "image/gif"
          : isWebp
            ? "image/webp"
            : isAvif
              ? "image/avif"
              : isSvg
                ? "image/svg+xml"
                : null;

    if (!detectedContentType) {
      console.error("[S3 Upload] Downloaded file is not a recognized image", {
        postId,
        source: imageLabel,
        expectedContentType: contentType,
        actualBytes: buffer.length,
        firstBytesHex: buffer
          .subarray(0, 16)
          .toString("hex"),
        firstBytesText: buffer
          .subarray(0, 100)
          .toString("utf8")
          .replace(/[^\x20-\x7E]/g, "."),
      });

      return null;
    }

    // Use the detected type rather than trusting HTTP headers.
    contentType = detectedContentType;

    console.info("[S3 Upload] Image validated", {
      postId,
      source: imageLabel,
      contentType,
      bytes: buffer.length,
    });

    // --------------------------------------------------------
    // STEP 5: PREPARE S3 OBJECT
    // --------------------------------------------------------

    const extension = getFileExtension(contentType, sourceUrl);

    const filename = safeFilename(sourceUrl).replace(
      /\.[^.]+$/,
      "",
    );

    const key =
      `venturebean/posts/${postId}/` +
      `${Date.now()}-${filename}.${extension}`;

    console.info("[S3 Upload] Uploading to S3", {
      postId,
      bucket: S3_BUCKET,
      region: AWS_REGION,
      key,
      contentType,
      bytes: buffer.length,
    });

    // --------------------------------------------------------
    // STEP 6: UPLOAD TO S3
    // --------------------------------------------------------

    try {
      const result = await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );

      const uploadedUrl =
        `${S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`;

      console.info("[S3 Upload] SUCCESS", {
        postId,
        bucket: S3_BUCKET,
        key,
        bytes: buffer.length,
        contentType,
        etag: result.ETag,
        url: uploadedUrl,
      });

      return uploadedUrl;
    } catch (error: unknown) {
      const awsError = error as {
        name?: string;
        message?: string;
        Code?: string;
        code?: string;
        $metadata?: {
          httpStatusCode?: number;
          requestId?: string;
          extendedRequestId?: string;
        };
      };

      console.error("[S3 Upload] AWS upload failed", {
        postId,
        bucket: S3_BUCKET,
        region: AWS_REGION,
        key,
        source: imageLabel,
        errorName: awsError.name,
        errorCode: awsError.Code || awsError.code,
        errorMessage: awsError.message,
        httpStatusCode: awsError.$metadata?.httpStatusCode,
        requestId: awsError.$metadata?.requestId,
        extendedRequestId:
          awsError.$metadata?.extendedRequestId,
      });

      return null;
    }
  } catch (error: unknown) {
    console.error("[S3 Upload] Unexpected failure", {
      postId,
      source: imageLabel,
      error:
        error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}

function getFeaturedImageUrl(post: WordPressPost): string | null {
  const media = post._embedded?.["wp:featuredmedia"]?.[0];

  return (
    media?.source_url ||
    media?.media_details?.sizes?.large?.source_url ||
    media?.media_details?.sizes?.full?.source_url ||
    null
  );
}

async function rewriteInlineImages(
  html: string,
  postId: number,
): Promise<string> {
  const imageUrls = new Set<string>();
  const imageTags = html.match(/<img\b[^>]*>/gi) || [];

  for (const tag of imageTags) {
    const attributes = tag.matchAll(
      /\b(?:src|data-src|data-lazy-src|srcset)=["']([^"']+)["']/gi,
    );

    for (const match of attributes) {
      const rawValue = match[1];

      // srcset may contain several comma-separated URLs.
      const candidates = rawValue
        .split(",")
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean);

      for (const candidate of candidates) {
        try {
          const url = new URL(candidate);
          if (
            url.protocol === "https:" &&
            WORDPRESS_HOSTS.has(url.hostname.toLowerCase())
          ) {
            imageUrls.add(candidate);
          }
        } catch {
          // Ignore relative, malformed, or non-HTTPS image references.
        }
      }
    }
  }

  let rewrittenHtml = html;

  // Upload sequentially to avoid overwhelming WordPress or S3.
  for (const sourceUrl of imageUrls) {
    const uploadedUrl = await uploadImageToS3(sourceUrl, postId);
    if (uploadedUrl) {
      rewrittenHtml = rewrittenHtml.split(sourceUrl).join(uploadedUrl);
    }
  }

  return rewrittenHtml;
}

async function authenticateAdmin(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return {
      ok: false as const,
      response: errorResponse("Authentication required. Please sign in again.", 401),
    };
  }

  try {
    const decoded = await serverAuth().verifySessionCookie(sessionCookie, true);

    // Authentication alone is not enough: require an admins/{uid} document.
    const adminSnapshot = await adminDb()
      .collection("admins")
      .doc(decoded.uid)
      .get();

    if (!adminSnapshot.exists) {
      return {
        ok: false as const,
        response: errorResponse("You do not have permission to import posts.", 403),
      };
    }

    return { ok: true as const, uid: decoded.uid };
  } catch (error) {
    console.error("WordPress import session verification failed:", {
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false as const,
      response: errorResponse("Your session is invalid or expired. Please sign in again.", 401),
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);
    if (!auth.ok) return auth.response;

    let body: { postId?: unknown; mode?: unknown };

    try {
      body = await request.json();
    } catch {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    const rawPostId = body.postId;
    const postId =
      typeof rawPostId === "number"
        ? rawPostId
        : typeof rawPostId === "string" && rawPostId.trim()
          ? Number(rawPostId)
          : NaN;

    if (!Number.isSafeInteger(postId) || postId <= 0) {
      return errorResponse("Please provide a valid numeric WordPress post ID.", 400);
    }

    const mode: ImportMode = body.mode === "summary" ? "summary" : "full";
    const wordpressUrl = `${WORDPRESS_API}/posts/${postId}?_embed=1`;

    const wordpressResponse = await fetch(wordpressUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });

    if (wordpressResponse.status === 404) {
      return errorResponse(`WordPress post ${postId} was not found.`, 404);
    }

    if (!wordpressResponse.ok) {
      const details = await wordpressResponse.text();
      console.error(
        "WordPress API returned an error:",
        wordpressResponse.status,
        details,
      );
      return errorResponse("WordPress could not return this post.", 502);
    }

    const wpPost = (await wordpressResponse.json()) as WordPressPost;

    if (!wpPost?.id || !wpPost.title || !wpPost.content) {
      return errorResponse("The WordPress response does not contain a valid post.", 502);
    }

    const title = stripHtml(wpPost.title.rendered || "");
    if (!title) {
      return errorResponse("The WordPress post has no title.", 422);
    }

    const excerpt = stripHtml(wpPost.excerpt?.rendered || "");
    let contentHtml =
      mode === "summary"
        ? wpPost.excerpt?.rendered || ""
        : wpPost.content.rendered || "";

    const originalFeaturedImage = getFeaturedImageUrl(wpPost);
    let featuredImage: string | null = null;

    if (originalFeaturedImage) {
      featuredImage =
        (await uploadImageToS3(originalFeaturedImage, postId)) ||
        originalFeaturedImage;
    }

    if (mode === "full") {
      contentHtml = await rewriteInlineImages(contentHtml, postId);
    }

    return NextResponse.json({
      success: true,
      post: {
  id: wpPost.id,
  title,
  slug: wpPost.slug || "",
  url: wpPost.link || "",
  excerpt,
  contentHtml,
  featuredImage,

  // Original WordPress creation date.
  createdAt: wpPost.date_gmt || wpPost.date || null,

  // Preserve the original publication date only for published posts.
  publishedAt:
    wpPost.status === "publish"
      ? wpPost.date_gmt || wpPost.date || null
      : null,

  // Original last-modified date.
  updatedAt: wpPost.modified_gmt || wpPost.modified || null,

  // Original WordPress status.
  status: wpPost.status,
},
    });
  } catch (error) {
    console.error("WordPress import failed:", error);

    const message =
      error instanceof Error ? error.message : "Unexpected WordPress import error.";

    return NextResponse.json(
      {
        success: false,
        error: "WordPress import failed.",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}
