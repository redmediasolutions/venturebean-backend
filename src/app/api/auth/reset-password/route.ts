import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Firebase API key is not configured." }, { status: 500 });
  }

  let body: { email?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          requestType: "PASSWORD_RESET",
          email,
        }),
      },
    );

    const result = (await response.json()) as { error?: { message?: string } };

    if (!response.ok) {
      // Avoid revealing whether an email address exists.
      console.error("Firebase password reset request failed:", result.error?.message);
    }

    // Keep the response generic to prevent email enumeration.
    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, a password reset email will be sent.",
    });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return NextResponse.json(
      { error: "Unable to request a password reset right now." },
      { status: 500 },
    );
  }
}
