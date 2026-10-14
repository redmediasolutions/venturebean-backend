import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { isAuthError, requireAdmin } from "@/lib/require-admin";
import { readJsonObject, str } from "@/lib/serialize";
import { slugify } from "@/lib/slugify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = "categories";
const POSTS = "posts";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/categories/:id — rename / move a category.
 * Posts keep a copy of their category slugs (for the website), so when a
 * slug changes every post in the category is updated too.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid category data." }, { status: 400 });

  try {
    const db = adminDb();
    const ref = db.collection(CATEGORIES).doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    const before = snapshot.data() ?? {};

    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if ("name" in body) {
      const name = str(body.name);
      if (!name) return NextResponse.json({ error: "Please enter a category name." }, { status: 400 });
      updates.name = name;
    }
    if ("slug" in body || "name" in body) {
      const slug = slugify(str(body.slug) || str(body.name) || String(before.slug ?? ""));
      if (!slug) return NextResponse.json({ error: "Please enter a valid slug." }, { status: 400 });
      const clash = await db.collection(CATEGORIES).where("slug", "==", slug).get();
      if (clash.docs.some((d) => d.id !== id)) {
        return NextResponse.json({ error: `Another category already uses the slug “${slug}”.` }, { status: 409 });
      }
      updates.slug = slug;
    }
    if ("description" in body) updates.description = str(body.description);
    if ("image" in body) updates.image = str(body.image) || null;
    if ("parentId" in body) {
      const parentId = str(body.parentId) || null;
      if (parentId === id) return NextResponse.json({ error: "A category can't be its own parent." }, { status: 400 });
      updates.parentId = parentId;
    }

    await ref.update(updates);

    // Keep posts' categorySlugs in sync when the slug changed.
    if (updates.slug && updates.slug !== before.slug) {
      const [posts, categories] = await Promise.all([
        db.collection(POSTS).where("categoryIds", "array-contains", id).get(),
        db.collection(CATEGORIES).get(),
      ]);
      const slugById = new Map(categories.docs.map((d) => [d.id, String(d.data().slug ?? "")]));
      let batch = db.batch();
      let count = 0;
      for (const post of posts.docs) {
        const ids: string[] = post.data().categoryIds ?? [];
        batch.update(post.ref, { categorySlugs: ids.map((cid) => slugById.get(cid)).filter(Boolean) });
        if (++count % 450 === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json({ error: "Failed to update category." }, { status: 500 });
  }
}

/**
 * DELETE /api/categories/:id
 * Posts are NOT deleted — they're just removed from the category.
 * Sub-categories move up one level.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  try {
    const db = adminDb();
    const ref = db.collection(CATEGORIES).doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    const category = snapshot.data() ?? {};

    const [posts, children] = await Promise.all([
      db.collection(POSTS).where("categoryIds", "array-contains", id).get(),
      db.collection(CATEGORIES).where("parentId", "==", id).get(),
    ]);

    const batch = db.batch();
    posts.docs.forEach((p) =>
      batch.update(p.ref, {
        categoryIds: FieldValue.arrayRemove(id),
        ...(category.slug ? { categorySlugs: FieldValue.arrayRemove(category.slug) } : {}),
      })
    );
    children.docs.forEach((c) => batch.update(c.ref, { parentId: category.parentId ?? null }));
    batch.delete(ref);
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json({ error: "Failed to delete category." }, { status: 500 });
  }
}
