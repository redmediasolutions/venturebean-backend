import { NextRequest, NextResponse } from "next/server";
import { adminDb, serverAuth } from "@/firebase/admin";

export const runtime = "nodejs";

const COOKIE_NAME = "session";
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

type SignUpResponse = {
  localId?: string;
  email?: string;
  displayName?: string;
  idToken?: string;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Firebase API key is not configured." }, { status: 500 });
  }

  let body: { name?: unknown; email?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      { error: "Name, a valid email, and a password of at least 8 characters are required." },
      { status: 400 },
    );
  }

  const db = adminDb();
  const admins = db.collection("admins");

  try {
    // Bootstrap only: once an admin exists, this public endpoint is disabled.
    // Do not leave this endpoint enabled as an invitation/registration route.
    const existingAdmins = await admins.limit(1).get();
    if (!existingAdmins.empty) {
      return NextResponse.json(
        { error: "Initial owner setup has already been completed." },
        { status: 403 },
      );
    }

    const signUpResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );

    const signup = (await signUpResponse.json()) as SignUpResponse & {
      error?: { message?: string };
    };

    if (!signUpResponse.ok || !signup.localId || !signup.idToken) {
      const code = signup.error?.message;
      const message =
        code === "EMAIL_EXISTS"
          ? "An account already exists with this email."
          : code === "WEAK_PASSWORD"
            ? "Choose a stronger password."
            : "Unable to create the owner account.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Verify the newly created identity, then grant admin access.
    const decoded = await serverAuth().verifyIdToken(signup.idToken, true);
    await admins.doc(decoded.uid).set({
      uid: decoded.uid,
      email: decoded.email ?? email,
      displayName: name,
      role: "owner",
      setupComplete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const sessionCookie = await serverAuth().createSessionCookie(signup.idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    const response = NextResponse.json({
      success: true,
      user: { uid: decoded.uid, email: decoded.email ?? email, displayName: name },
      access: "admin",
      setup: "needed",
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
    console.error("Initial owner creation failed:", error);
    return NextResponse.json(
      { error: "Unable to complete initial owner setup." },
      { status: 500 },
    );
  }
}
