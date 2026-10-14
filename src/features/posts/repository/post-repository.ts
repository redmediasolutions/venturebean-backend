import type { Post } from "@/features/posts/types";

const POSTS_API = "/api/posts";

export interface PostRecord {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string | null;
  featuredImageAlt?: string | null;
  status?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  categorySlugs?: string[];
  tags?: string[];
  author?: string | null;
  authorId?: string | null;
  publishedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
}

type PostApiResponse =
  | PostRecord
  | {
      post?: PostRecord | null;
      data?: PostRecord | null;
    };

interface PostsApiResponse {
  posts?: PostRecord[];
  data?: PostRecord[];
  ids?: string[];
}

/**
 * Checks whether a value is a non-null object.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Checks whether a value is a PostRecord.
 */
function isPostRecord(value: unknown): value is PostRecord {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" ||
    typeof value.title === "string" ||
    typeof value.slug === "string"
  );
}

/**
 * Extracts a PostRecord from either a direct API response or
 * a wrapped response such as { post: ... } or { data: ... }.
 *
 * This avoids relying on TypeScript's "in" operator to narrow
 * a union containing PostRecord's index signature.
 */
function extractPostRecord(response: PostApiResponse): PostRecord {
  const value: unknown = response;

  if (!isObject(value)) {
    throw new Error("Invalid post API response.");
  }

  const wrappedPost = value.post;
  const wrappedData = value.data;

  if (isPostRecord(wrappedPost)) {
    return wrappedPost;
  }

  if (isPostRecord(wrappedData)) {
    return wrappedData;
  }

  if (isPostRecord(value)) {
    return value;
  }

  throw new Error("The API response does not contain a valid post.");
}

/**
 * Converts supported date representations into a Date.
 */
function toDate(value: unknown): Date | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (isObject(value)) {
    const timestamp = value as {
      seconds?: number;
      _seconds?: number;
      nanoseconds?: number;
      _nanoseconds?: number;
      toDate?: () => Date;
    };

    if (typeof timestamp.toDate === "function") {
      try {
        const date = timestamp.toDate();

        return date instanceof Date && !Number.isNaN(date.getTime())
          ? date
          : null;
      } catch {
        return null;
      }
    }

    const seconds = timestamp.seconds ?? timestamp._seconds;
    const nanoseconds =
      timestamp.nanoseconds ?? timestamp._nanoseconds ?? 0;

    if (typeof seconds === "number") {
      const date = new Date(
        seconds * 1000 + Math.floor(nanoseconds / 1_000_000),
      );

      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

/**
 * Serializes Date values before sending them to the API.
 */
function serializeDates(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...data };

  for (const key of ["publishedAt", "createdAt", "updatedAt"]) {
    const value = result[key];

    if (value instanceof Date) {
      result[key] = value.toISOString();
    }
  }

  return result;
}

/**
 * Converts an API record into the application's Post type.
 */
function fromRecord(record: PostRecord): Post {
  return {
    ...record,
    publishedAt: toDate(record.publishedAt),
    createdAt: toDate(record.createdAt),
    updatedAt: toDate(record.updatedAt),
  } as unknown as Post;
}

/**
 * Converts multiple API records.
 */
function fromRecords(records: PostRecord[]): Post[] {
  return records.map(fromRecord);
}

/**
 * Shared fetch helper.
 *
 * Authentication is handled through the HTTP-only session cookie.
 * No Firebase Client SDK or bearer token is used.
 */
async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;

    try {
      const body: unknown = await response.json();

      if (isObject(body)) {
        if (typeof body.error === "string") {
          message = body.error;
        } else if (typeof body.message === "string") {
          message = body.message;
        }
      }
    } catch {
      // Keep the default message if the response isn't JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * GET /api/posts
 */
export async function postsQuery(): Promise<Post[]> {
  const response = await apiRequest<
    PostRecord[] | PostsApiResponse
  >(POSTS_API);

  let records: PostRecord[];

  if (Array.isArray(response)) {
    records = response;
  } else if (Array.isArray(response.posts)) {
    records = response.posts;
  } else if (Array.isArray(response.data)) {
    records = response.data;
  } else {
    records = [];
  }

  return fromRecords(records).sort((a, b) => {
    const dateA = toDate(
      (a as unknown as Record<string, unknown>).updatedAt,
    );

    const dateB = toDate(
      (b as unknown as Record<string, unknown>).updatedAt,
    );

    return (dateB?.getTime() ?? 0) - (dateA?.getTime() ?? 0);
  });
}

/**
 * GET /api/posts/:id
 */
export async function getPost(id: string): Promise<Post | null> {
  if (!id.trim()) {
    throw new Error("Post ID is required.");
  }

  const response = await apiRequest<PostApiResponse | null>(
    `${POSTS_API}/${encodeURIComponent(id)}`,
  );

  if (response == null) {
    return null;
  }

  return fromRecord(extractPostRecord(response));
}

/**
 * GET /api/posts?slug=:slug
 */
export async function findPostIdsBySlug(
  slug: string,
): Promise<string[]> {
  if (!slug.trim()) {
    return [];
  }

  const response = await apiRequest<unknown>(
    `${POSTS_API}?slug=${encodeURIComponent(slug)}`,
  );

  if (Array.isArray(response)) {
    return response
      .filter(isPostRecord)
      .map((post) => post.id)
      .filter((id): id is string => typeof id === "string");
  }

  if (!isObject(response)) {
    return [];
  }

  if (Array.isArray(response.ids)) {
    return response.ids.filter(
      (id): id is string => typeof id === "string",
    );
  }

  const records = Array.isArray(response.posts)
    ? response.posts
    : Array.isArray(response.data)
      ? response.data
      : [];

  return records
    .filter(isPostRecord)
    .map((post) => post.id)
    .filter((id): id is string => typeof id === "string");
}

/**
 * POST /api/posts
 */
export async function createPost(
  post: Partial<Post>,
): Promise<string> {
  const payload = serializeDates(
    post as Record<string, unknown>,
  );

  const response = await apiRequest<unknown>(POSTS_API, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (isObject(response)) {
    if (typeof response.id === "string") {
      return response.id;
    }

    if (isPostRecord(response.post) && response.post.id) {
      return response.post.id;
    }

    if (isPostRecord(response.data) && response.data.id) {
      return response.data.id;
    }
  }

  throw new Error("The API did not return the ID of the created post.");
}

/**
 * PATCH /api/posts/:id
 */
export async function updatePost(
  id: string,
  updates: Partial<Post>,
): Promise<void> {
  if (!id.trim()) {
    throw new Error("Post ID is required.");
  }

  const payload = serializeDates(
    updates as Record<string, unknown>,
  );

  await apiRequest<void>(
    `${POSTS_API}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

/**
 * PATCH /api/posts/:id
 */
export async function setPostStatus(
  id: string,
  status: string,
): Promise<void> {
  if (!id.trim()) {
    throw new Error("Post ID is required.");
  }

  await apiRequest<void>(
    `${POSTS_API}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

/**
 * DELETE /api/posts/:id
 */
export async function deletePost(id: string): Promise<void> {
  if (!id.trim()) {
    throw new Error("Post ID is required.");
  }

  await apiRequest<void>(
    `${POSTS_API}/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
}