import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { isAuthError, requireAdmin } from "@/lib/require-admin";
import { readJsonObject, serializeDoc, str } from "@/lib/serialize";
import { slugify } from "@/lib/slugify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = "categories";

/** GET /api/categories — all categories, sorted by name. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    const snapshot = await adminDb().collection(CATEGORIES).get();
    const categories = snapshot.docs
      .map((d) => serializeDoc(d.id, d.data()))
      .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories." }, { status: 500 });
  }
}

/** POST /api/categories — create a category. Body: { name, slug?, description?, parentId? } */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid category data." }, { status: 400 });

  const name = str(body.name);
  const slug = slugify(str(body.slug) || name);
  if (!name || !slug) return NextResponse.json({ error: "Please enter a category name." }, { status: 400 });

  try {
    const db = adminDb();
    const existing = await db.collection(CATEGORIES).where("slug", "==", slug).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ error: `Another category already uses the slug “${slug}”.` }, { status: 409 });
    }
    const data = {
      name,
      slug,
      description: str(body.description),
      parentId: str(body.parentId) || null,
      image: str(body.image) || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    const ref = await db.collection(CATEGORIES).add(data);
    return NextResponse.json({ id: ref.id, category: { ...data, id: ref.id, createdAt: null, updatedAt: null } }, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json({ error: "Failed to create category." }, { status: 500 });
  }
}
