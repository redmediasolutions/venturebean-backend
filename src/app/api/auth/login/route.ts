import { NextRequest, NextResponse } from "next/server";
import { adminDb, serverAuth } from "@/firebase/admin";

export const runtime = "nodejs";

const COOKIE_NAME = "session";
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

type FirebaseSignInResponse = {
  localId?: string;
  email?: string;
  displayName?: string;
  idToken?: string;
  error?: { message?: string };
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Firebase API key is not configured on the server." },
      { status: 500 },
    );
  }

  let body: { email?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  try {
    // Use Firebase's Identity Toolkit REST API server-side to validate
    // email/password without shipping the Firebase Client SDK to the browser.
    const signInResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      },
    );

    const signIn = (await signInResponse.json()) as FirebaseSignInResponse;

    if (!signInResponse.ok || !signIn.idToken || !signIn.localId) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const adminSnapshot = await adminDb()
      .collection("admins")
      .doc(signIn.localId)
      .get();

    if (!adminSnapshot.exists) {
      return NextResponse.json(
        { error: "This account is not authorized to access the admin dashboard." },
        { status: 403 },
      );
    }

    // Verify the ID token server-side before minting a session cookie.
    const decoded = await serverAuth().verifyIdToken(signIn.idToken, true);
    const sessionCookie = await serverAuth().createSessionCookie(signIn.idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    const adminData = adminSnapshot.data() ?? {};
    const response = NextResponse.json({
      success: true,
      user: {
        uid: decoded.uid,
        email: decoded.email ?? signIn.email ?? null,
        displayName:
          typeof adminData.displayName === "string"
            ? adminData.displayName
            : (signIn.displayName ?? null),
      },
      access: "admin",
      setup: adminData.setupComplete === false ? "needed" : "complete",
    });

    response.cookies.set(COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    });

    return response;
  } catch (error) {
    console.error("Authentication login failed:", error);
    return NextResponse.json(
      { error: "Unable to sign in right now. Please try again." },
      { status: 500 },
    );
  }
}
