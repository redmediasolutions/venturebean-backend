import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { isAuthError, requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POSTS_COLLECTION = "posts";

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;

    // Convert Firestore Timestamp instances into ISO strings.
    if (
      typeof item.toDate === "function" &&
      typeof item.seconds === "number"
    ) {
      const date = (item.toDate as () => Date)();

      return date.toISOString();
    }

    const result: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(item)) {
      // Don't serialize Firestore document references or methods.
      if (typeof nestedValue === "function") {
        continue;
      }

      result[key] = serializeValue(nestedValue);
    }

    return result;
  }

  return value;
}

function serializePost(
  id: string,
  data: Record<string, unknown>,
): Record<string, unknown> & { id: string } {
  return {
    ...(serializeValue(data) as Record<string, unknown>),
    id,
  };
}
/**
 * GET /api/posts
 *
 * Lists posts or searches for posts by slug.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (isAuthError(auth)) {
    return auth;
  }

  try {
    const db = adminDb();
    const slug = request.nextUrl.searchParams.get("slug");

    if (slug) {
      const snapshot = await db
        .collection(POSTS_COLLECTION)
        .where("slug", "==", slug)
        .get();

      const ids = snapshot.docs.map((doc) => doc.id);

      return NextResponse.json({ ids });
    }

    const snapshot = await db
      .collection(POSTS_COLLECTION)
      .get();

    const posts = snapshot.docs
      .map((doc) =>
        serializePost(
          doc.id,
          doc.data() as Record<string, unknown>,
        ),
      )
      .sort((a, b) => {
        const dateA = Date.parse(
          String(a.updatedAt ?? a.createdAt ?? ""),
        );

        const dateB = Date.parse(
          String(b.updatedAt ?? b.createdAt ?? ""),
        );

        return (
          (Number.isNaN(dateB) ? 0 : dateB) -
          (Number.isNaN(dateA) ? 0 : dateA)
        );
      });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Failed to fetch posts:", error);

    return NextResponse.json(
      { error: "Failed to fetch posts." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/posts
 *
 * Creates a post.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (isAuthError(auth)) {
    return auth;
  }

  try {
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid post data." },
        { status: 400 },
      );
    }

    const input = body as Record<string, unknown>;

    const title =
      typeof input.title === "string" ? input.title.trim() : "";

    const slug =
      typeof input.slug === "string" ? input.slug.trim() : "";

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Post title and slug are required." },
        { status: 400 },
      );
    }

    const { id: _ignoredId, ...postData } = input;

    const now = FieldValue.serverTimestamp();

    const docRef = await adminDb()
      .collection(POSTS_COLLECTION)
      .add({
        ...postData,
        title,
        slug,
        createdAt: now,
        updatedAt: now,
      });

    return NextResponse.json(
      {
        id: docRef.id,
        post: {
          ...postData,
          id: docRef.id,
          title,
          slug,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create post:", error);

    return NextResponse.json(
      { error: "Failed to create post." },
      { status: 500 },
    );
  }
}