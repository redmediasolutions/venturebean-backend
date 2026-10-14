import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/firebase/admin";
import { isAuthError, requireAdmin } from "@/lib/require-admin";
import { readJsonObject, str } from "@/lib/serialize";
import { deleteFromS3 } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };
const ref = (id: string) => adminDb().collection("media").doc(id);

/** PATCH /api/media/:id — change file name / alt text. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid data." }, { status: 400 });
  try {
    const snapshot = await ref(id).get();
    if (!snapshot.exists) return NextResponse.json({ error: "File not found." }, { status: 404 });
    const updates: Record<string, unknown> = {};
    if ("alt" in body) updates.alt = str(body.alt);
    if ("name" in body && str(body.name)) updates.name = str(body.name);
    await ref(id).update(updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update media:", error);
    return NextResponse.json({ error: "Failed to update file." }, { status: 500 });
  }
}

/** DELETE /api/media/:id — remove the file from storage and the library. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  try {
    const snapshot = await ref(id).get();
    if (!snapshot.exists) return NextResponse.json({ error: "File not found." }, { status: 404 });
    const item = snapshot.data() ?? {};
    const path = String(item.path ?? "");

    if (path) {
      try {
        if (item.storage === "s3" || path.startsWith("venturebean/")) {
          await deleteFromS3(path);
        } else {
          // Older uploads were stored in Firebase Storage.
          await adminStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).file(path).delete({ ignoreNotFound: true });
        }
      } catch (error) {
        // Still remove it from the library even if the file is already gone.
        console.warn("Could not delete stored file:", path, error);
      }
    }
    await ref(id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete media:", error);
    return NextResponse.json({ error: "Failed to delete file." }, { status: 500 });
  }
}
