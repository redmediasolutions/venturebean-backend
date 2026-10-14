import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { isAuthError, requireAdmin } from "@/lib/require-admin";
import { readJsonObject, serializeDoc } from "@/lib/serialize";
import { cleanFieldGroup } from "@/lib/field-group-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELD_GROUPS = "fieldGroups";

/** GET /api/field-groups */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  try {
    const snapshot = await adminDb().collection(FIELD_GROUPS).get();
    const groups = snapshot.docs
      .map((d) => serializeDoc(d.id, d.data()))
      .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Failed to fetch field groups:", error);
    return NextResponse.json({ error: "Failed to fetch field groups." }, { status: 500 });
  }
}

/** POST /api/field-groups */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid field group data." }, { status: 400 });
  const data = cleanFieldGroup(body);
  if (!data.title) return NextResponse.json({ error: "Please give the field group a title." }, { status: 400 });
  try {
    const ref = await adminDb()
      .collection(FIELD_GROUPS)
      .add({ active: true, order: 0, fields: [], categoryIds: [], location: "all", description: "", ...data, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create field group:", error);
    return NextResponse.json({ error: "Failed to create field group." }, { status: 500 });
  }
}
