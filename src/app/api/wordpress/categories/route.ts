import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireAdmin } from "@/lib/require-admin";
import { listWordPressCategories } from "@/lib/wordpress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/wordpress/categories
 * Lists the categories on the VentureBean WordPress site (id, name, post count),
 * so editors can pick one instead of looking up IDs.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const categories = await listWordPressCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Failed to list WordPress categories:", error);
    return NextResponse.json({ error: "Could not load categories from WordPress." }, { status: 502 });
  }
}
