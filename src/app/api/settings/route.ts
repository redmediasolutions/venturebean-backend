import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/admin";
import { isAuthError, requireAdmin } from "@/lib/require-admin";
import { readJsonObject, serializeValue, str } from "@/lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const settingsDoc = () => adminDb().collection("settings").doc("general");

/** GET /api/settings — website settings (name, address, post URL pattern). */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  try {
    const snapshot = await settingsDoc().get();
    return NextResponse.json({ settings: serializeValue(snapshot.data() ?? {}) });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings." }, { status: 500 });
  }
}

/** PUT /api/settings */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
  try {
    await settingsDoc().set(
      {
        siteName: str(body.siteName),
        siteUrl: str(body.siteUrl).replace(/\/+$/, ""),
        postUrlPattern: str(body.postUrlPattern) || "/blog/{slug}",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
