/**
 * Firebase Admin SDK for VentureBean.
 *
 * SERVER-SIDE ONLY.
 *
 * Used for:
 *   - Firebase ID token verification
 *   - Server-side Authentication operations
 *   - Firestore administration
 *
 * Never import this module into client components.
 */

import "server-only";

import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";

import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// ============================================================
// ADMIN INITIALIZATION
// ============================================================

const ADMIN_APP_NAME = "venturebean-admin";

let adminAppInstance: App | undefined;

/**
 * Initialize or retrieve the Firebase Admin app.
 */
function getAdminApp(): App {
  if (adminAppInstance) {
    return adminAppInstance;
  }

  console.log("\n========== FIREBASE ADMIN ENV CHECK ==========");
  console.log("Working directory:", process.cwd());

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const serviceAccountJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  console.log("FIREBASE_ADMIN_PROJECT_ID:", {
    found: Boolean(projectId),
    value: projectId || "MISSING",
  });

  console.log("FIREBASE_SERVICE_ACCOUNT_KEY:", {
    found: Boolean(serviceAccountJson),
    length: serviceAccountJson?.length ?? 0,
  });

  console.log(
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID:",
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "MISSING",
  );

  console.log("================================================\n");

  if (!projectId || !serviceAccountJson) {
    console.error(
      "Firebase Admin initialization failed: required environment variables are missing.",
    );

    throw new Error(
      "Firebase Admin environment variables are not configured.",
    );
  }

  let serviceAccount: {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };

  try {
    serviceAccount = JSON.parse(serviceAccountJson);

    console.log("Service account JSON parsed successfully:", {
      projectId: serviceAccount.project_id,
      clientEmailFound: Boolean(serviceAccount.client_email),
      privateKeyFound: Boolean(serviceAccount.private_key),
    });
  } catch (error) {
    console.error(
      "Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON.",
      error instanceof Error ? error.message : "Unknown error",
    );

    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY must contain valid JSON.",
    );
  }

  if (serviceAccount.project_id !== projectId) {
    console.error("Firebase project mismatch:", {
      configuredProjectId: projectId,
      serviceAccountProjectId: serviceAccount.project_id,
    });

    throw new Error(
      "Firebase project mismatch between the Admin environment and service account.",
    );
  }

  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    console.error("Firebase service account is incomplete:", {
      clientEmailFound: Boolean(serviceAccount.client_email),
      privateKeyFound: Boolean(serviceAccount.private_key),
    });

    throw new Error(
      "Firebase service account is missing client_email or private_key.",
    );
  }

  const existingApp = getApps().find(
    (app) => app.name === ADMIN_APP_NAME,
  );

  adminAppInstance =
    existingApp ??
    initializeApp(
      {
        credential: cert({
          projectId,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key.replace(
            /\\n/g,
            "\n",
          ),
        }),
        projectId,
      },
      ADMIN_APP_NAME,
    );

  console.log("Firebase Admin initialized successfully:", {
    appName: ADMIN_APP_NAME,
    projectId,
  });

  return adminAppInstance;
}

// ============================================================
// ADMIN AUTH
// ============================================================

/**
 * Get Firebase Admin Authentication.
 */
export function serverAuth(): Auth {
  return getAuth(getAdminApp());
}

/**
 * Verify a Firebase ID token on the server.
 *
 * Returns the decoded token when verification succeeds.
 * Throws an error when the token is invalid or verification fails.
 */
export async function verifyFirebaseIdToken(token: string) {
  if (!token || !token.trim()) {
    throw new Error("Firebase ID token is required.");
  }

  try {
    const auth = serverAuth();

    const decodedToken = await auth.verifyIdToken(token);

    console.info("Firebase ID token verified successfully:", {
      uid: decodedToken.uid,
      audience: decodedToken.aud,
      issuer: decodedToken.iss,
    });

    return decodedToken;
  } catch (error: unknown) {
    const firebaseError = error as {
      code?: string;
      message?: string;
      name?: string;
    };

    console.error("Firebase ID token verification failed:", {
      name: firebaseError.name,
      code: firebaseError.code,
      message: firebaseError.message,
    });

    throw error;
  }
}

// ============================================================
// ADMIN FIRESTORE
// ============================================================

/**
 * Get Firebase Admin Firestore.
 */
export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}