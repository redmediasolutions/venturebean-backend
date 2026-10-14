import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, serverAuth } from "@/firebase/admin";
import { isAuthError, requireAdmin } from "@/lib/require-admin";
import { readJsonObject, serializeDoc, str } from "@/lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/team — everyone with admin access. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  try {
    const snapshot = await adminDb().collection("admins").get();
    return NextResponse.json({ members: snapshot.docs.map((d) => serializeDoc(d.id, d.data())) });
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return NextResponse.json({ error: "Failed to fetch team." }, { status: 500 });
  }
}

/**
 * POST /api/team — add a team member.
 * Creates their login (email + password) and gives them admin access.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid member data." }, { status: 400 });

  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  try {
    const user = await serverAuth().createUser({ email, password, displayName: name || undefined });
    await adminDb().collection("admins").doc(user.uid).set({
      name,
      email,
      role: "admin",
      addedBy: auth.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ uid: user.uid }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    if (code === "auth/invalid-password") {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }
    console.error("Failed to add team member:", error);
    return NextResponse.json({ error: "Failed to add team member." }, { status: 500 });
  }
}
