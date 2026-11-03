import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/admin";
import { COLLECTIONS } from "@/firebase/collections";
import { isAuthError, requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/report-downloads/:id — remove one entry (e.g. a test or spam email). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  try {
    await adminDb().collection(COLLECTIONS.reportDownloads).doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete report download:", error);
    return NextResponse.json({ error: "Failed to delete this entry." }, { status: 500 });
  }
}
