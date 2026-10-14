import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireAdmin } from "@/lib/require-admin";
import { getWordPressCategory, listWordPressPostsInCategory, parsePositiveInt } from "@/lib/wordpress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/wordpress/category-posts?categoryId=99
 * Returns the category and the list of its published posts (id, title, slug, date).
 * The admin panel then imports them one by one through /api/wordpress/import,
 * so each request stays short and progress can be shown.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  const categoryId = parsePositiveInt(request.nextUrl.searchParams.get("categoryId"));
  if (!categoryId) {
    return NextResponse.json({ error: "Please provide a valid numeric WordPress category ID." }, { status: 400 });
  }

  try {
    const category = await getWordPressCategory(categoryId);
    if (!category) {
      return NextResponse.json({ error: `WordPress category ${categoryId} was not found.` }, { status: 404 });
    }
    const posts = await listWordPressPostsInCategory(categoryId);
    return NextResponse.json({ category, posts });
  } catch (error) {
    console.error("Failed to list WordPress category posts:", error);
    return NextResponse.json({ error: "Could not load posts from WordPress." }, { status: 502 });
  }
}
