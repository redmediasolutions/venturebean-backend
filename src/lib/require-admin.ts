import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { adminDb, serverAuth } from "@/firebase/admin";

interface AdminIdentity {
  uid: string;
  email?: string;
}

type AdminCheckResult = AdminIdentity | NextResponse;

export async function requireAdmin(
  request: NextRequest,
): Promise<AdminCheckResult> {
  const sessionCookie = request.cookies.get("session")?.value;

  if (!sessionCookie) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const decoded = await serverAuth().verifySessionCookie(
      sessionCookie,
      true,
    );

    const adminSnapshot = await adminDb()
      .collection("admins")
      .doc(decoded.uid)
      .get();

    if (!adminSnapshot.exists) {
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 },
      );
    }

    return {
      uid: decoded.uid,
      email: decoded.email,
    };
  } catch (error) {
    console.error("Admin session verification failed:", error);

    return NextResponse.json(
      { error: "Your session is invalid or has expired. Please log in again." },
      { status: 401 },
    );
  }
}

export function isAuthError(
  result: AdminCheckResult,
): result is NextResponse {
  return result instanceof NextResponse;
}