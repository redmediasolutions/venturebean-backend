"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * User information returned by our Next.js backend.
 *
 * This is intentionally not a Firebase User object.
 * The Firebase Client SDK is not used in this provider.
 */
export interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Access status:
 * - checking: access is being verified
 * - admin: user has admin access
 * - not-admin: signed in, but not an admin
 * - rules-blocked: retained for compatibility with existing UI
 */
export type AccessStatus =
  | "checking"
  | "admin"
  | "not-admin"
  | "rules-blocked";

/**
 * Setup state:
 * - null: still loading
 * - needed: initial owner account has not been created
 * - done: setup has been completed
 * - blocked: setup status cannot be determined
 */
export type SetupState = null | "needed" | "done" | "blocked";

interface AuthContextValue {
  user: AdminUser | null;
  isAdmin: boolean;
  access: AccessStatus;
  setup: SetupState;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  createOwnerAccount: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  recheckAccess: () => Promise<void>;
}

interface SessionResponse {
  authenticated: boolean;
  user?: AdminUser | null;
  access?: AccessStatus;
  setup?: SetupState;
  error?: string;
  message?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Parse a backend response without assuming that it contains JSON.
 */
async function readResponse<T>(
  response: Response
): Promise<T> {
  const text = await response.text();

  let data: unknown;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      text || `Request failed with status ${response.status}.`
    );
  }

  if (!response.ok) {
    const errorData = data as {
      error?: string;
      message?: string;
    };

    throw new Error(
      errorData.error ||
        errorData.message ||
        `Request failed with status ${response.status}.`
    );
  }

  return data as T;
}

/**
 * Keeps track of the authenticated user using the server session.
 *
 * Authentication cookies must be HTTP-only and created by the
 * Next.js backend. No Firebase Client SDK is used here.
 */
export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AdminUser | null>(null);

  const [access, setAccess] =
    useState<AccessStatus>("checking");

  const [setup, setSetup] = useState<SetupState>(null);

  const [authLoading, setAuthLoading] = useState(true);

  /**
   * Fetch the current session from the backend.
   */
  const refreshSession = useCallback(async () => {
    setAuthLoading(true);

    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const data = await readResponse<SessionResponse>(response);

      setSetup(data.setup ?? "blocked");

      if (!data.authenticated || !data.user) {
        setUser(null);
        setAccess("checking");
        return;
      }

      setUser(data.user);
      setAccess(data.access ?? "not-admin");
    } catch (error) {
      console.error("Session verification failed:", error);

      setUser(null);
      setAccess("checking");
      setSetup((current) => current ?? "blocked");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /**
   * Load the session when the provider mounts.
   *
   * The HTTP-only cookie is sent automatically by the browser.
   */
  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  /**
   * Sign in through the Next.js backend.
   *
   * The backend verifies the credentials and creates an HTTP-only
   * Firebase session cookie.
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      setAuthLoading(true);

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

        await readResponse<{ success: boolean }>(response);

        await refreshSession();
      } catch (error) {
        setUser(null);
        setAccess("checking");
        throw error;
      } finally {
        setAuthLoading(false);
      }
    },
    [refreshSession]
  );

  /**
   * Create the initial owner account.
   *
   * The backend must verify that initial setup has not already
   * been completed before creating the owner.
   */
  const createOwnerAccount = useCallback(
    async (name: string, email: string, password: string) => {
      setAuthLoading(true);

      try {
        const response = await fetch(
          "/api/auth/create-owner",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "same-origin",
            cache: "no-store",
            body: JSON.stringify({
              name: name.trim(),
              email: email.trim(),
              password,
            }),
          }
        );

        await readResponse<{ success: boolean }>(response);

        await refreshSession();
      } catch (error) {
        setUser(null);
        setAccess("checking");
        throw error;
      } finally {
        setAuthLoading(false);
      }
    },
    [refreshSession]
  );

  /**
   * Sign out by clearing the server-side session cookie.
   */
  const signOut = useCallback(async () => {
    setAuthLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });

      await readResponse<{ success: boolean }>(response);

      setUser(null);
      setAccess("checking");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  /**
   * Request a password-reset email through the backend.
   */
  const resetPassword = useCallback(
    async (email: string) => {
      const response = await fetch(
        "/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      await readResponse<{ success: boolean }>(response);
    },
    []
  );

  /**
   * Recheck the current user's session and admin permissions.
   */
  const recheckAccess = useCallback(async () => {
    await refreshSession();
  }, [refreshSession]);

  const value: AuthContextValue = {
    user,
    isAdmin: access === "admin",
    access,
    setup,
    loading: authLoading || access === "checking" && Boolean(user),
    signIn,
    createOwnerAccount,
    signOut,
    resetPassword,
    recheckAccess,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Access authentication state from any component inside AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside <AuthProvider>"
    );
  }

  return context;
}