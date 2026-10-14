import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { isAuthError, requireAdmin } from "@/lib/require-admin";
import { readJsonObject, serializeDoc } from "@/lib/serialize";
import { cleanFieldGroup } from "@/lib/field-group-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };
const ref = (id: string) => adminDb().collection("fieldGroups").doc(id);

/** GET /api/field-groups/:id */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  const snapshot = await ref(id).get();
  if (!snapshot.exists) return NextResponse.json({ error: "Field group not found." }, { status: 404 });
  return NextResponse.json({ group: serializeDoc(id, snapshot.data()) });
}

/** PATCH /api/field-groups/:id */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid field group data." }, { status: 400 });
  try {
    const snapshot = await ref(id).get();
    if (!snapshot.exists) return NextResponse.json({ error: "Field group not found." }, { status: 404 });
    await ref(id).update({ ...cleanFieldGroup(body), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update field group:", error);
    return NextResponse.json({ error: "Failed to update field group." }, { status: 500 });
  }
}

/** DELETE /api/field-groups/:id — values already saved on posts are kept. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  try {
    await ref(id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete field group:", error);
    return NextResponse.json({ error: "Failed to delete field group." }, { status: 500 });
  }
}
