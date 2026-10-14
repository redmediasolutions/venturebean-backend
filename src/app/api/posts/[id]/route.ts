import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { isAuthError, requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POSTS_COLLECTION = "posts";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;

    if (
      typeof item.toDate === "function" &&
      typeof item.seconds === "number"
    ) {
      const date = (item.toDate as () => Date)();

      return date.toISOString();
    }

    const result: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(item)) {
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
) {
  return {
    ...(serializeValue(data) as Record<string, unknown>),
    id,
  };
}

/**
 * GET /api/posts/:id
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const auth = await requireAdmin(request);

  if (isAuthError(auth)) {
    return auth;
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Post ID is required." },
        { status: 400 },
      );
    }

    const snapshot = await adminDb()
      .collection(POSTS_COLLECTION)
      .doc(id)
      .get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Post not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      post: serializePost(
        snapshot.id,
        snapshot.data() as Record<string, unknown>,
      ),
    });
  } catch (error) {
    console.error("Failed to fetch post:", error);

    return NextResponse.json(
      { error: "Failed to fetch post." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/posts/:id
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const auth = await requireAdmin(request);

  if (isAuthError(auth)) {
    return auth;
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Post ID is required." },
        { status: 400 },
      );
    }

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
    const { id: _ignoredId, ...updates } = input;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided." },
        { status: 400 },
      );
    }

    const postRef = adminDb()
      .collection(POSTS_COLLECTION)
      .doc(id);

    const snapshot = await postRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Post not found." },
        { status: 404 },
      );
    }

    await postRef.update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedSnapshot = await postRef.get();

    return NextResponse.json({
      post: serializePost(
        updatedSnapshot.id,
        updatedSnapshot.data() as Record<string, unknown>,
      ),
    });
  } catch (error) {
    console.error("Failed to update post:", error);

    return NextResponse.json(
      { error: "Failed to update post." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/posts/:id
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  const auth = await requireAdmin(request);

  if (isAuthError(auth)) {
    return auth;
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Post ID is required." },
        { status: 400 },
      );
    }

    const postRef = adminDb()
      .collection(POSTS_COLLECTION)
      .doc(id);

    const snapshot = await postRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Post not found." },
        { status: 404 },
      );
    }

    await postRef.delete();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete post:", error);

    return NextResponse.json(
      { error: "Failed to delete post." },
      { status: 500 },
    );
  }
}