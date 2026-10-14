import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebase/admin";
import { isAuthError, requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ uid: string }> };

/**
 * DELETE /api/team/:uid — remove admin access.
 * (Their login still exists, but they can no longer use the admin panel.)
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  const { uid } = await params;

  if (uid === auth.uid) return NextResponse.json({ error: "You can't remove yourself." }, { status: 400 });
  try {
    const ref = adminDb().collection("admins").doc(uid);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    if (snapshot.data()?.role === "owner") return NextResponse.json({ error: "The owner can't be removed." }, { status: 400 });
    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove team member:", error);
    return NextResponse.json({ error: "Failed to remove team member." }, { status: 500 });
  }
}
