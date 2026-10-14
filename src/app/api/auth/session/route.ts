import { NextRequest, NextResponse } from "next/server";
import { adminDb, serverAuth } from "@/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "session";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      access: "none",
      setup: "needed",
    });
  }

  try {
    const decoded = await serverAuth().verifySessionCookie(sessionCookie, true);
    const adminSnapshot = await adminDb().collection("admins").doc(decoded.uid).get();

    if (!adminSnapshot.exists) {
      const response = NextResponse.json({
        authenticated: false,
        user: null,
        access: "denied",
        setup: "needed",
      });
      response.cookies.set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    const adminData = adminSnapshot.data() ?? {};

    return NextResponse.json({
      authenticated: true,
      user: {
        uid: decoded.uid,
        email: decoded.email ?? null,
        displayName:
          typeof adminData.displayName === "string"
            ? adminData.displayName
            : (decoded.name ?? null),
      },
      access: "admin",
      // Adjust this check if your setup document uses a different schema.
      setup: adminData.setupComplete === false ? "needed" : "complete",
    });
  } catch {
    const response = NextResponse.json({
      authenticated: false,
      user: null,
      access: "none",
      setup: "needed",
    });
    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }
}
