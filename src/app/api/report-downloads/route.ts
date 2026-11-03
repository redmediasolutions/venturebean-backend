import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/admin";
import { COLLECTIONS } from "@/firebase/collections";
import { isAuthError, requireAdmin } from "@/lib/require-admin";
import { serializeDoc } from "@/lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/report-downloads — emails left by website visitors before
 * downloading a report, newest first.
 * (The website adds them straight to Firestore; see firestore.rules.)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  try {
    const snapshot = await adminDb().collection(COLLECTIONS.reportDownloads).orderBy("createdAt", "desc").limit(10000).get();
    return NextResponse.json({ downloads: snapshot.docs.map((d) => serializeDoc(d.id, d.data())) });
  } catch (error) {
    console.error("Failed to fetch report downloads:", error);
    return NextResponse.json({ error: "Failed to load report downloads." }, { status: 500 });
  }
}
