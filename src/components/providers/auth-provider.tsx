"use client";

/**
 * Keeps track of who is logged in and whether they are an admin.
 *
 * How access works:
 *  - The FIRST person to create an account becomes the owner (admin) automatically.
 *  - After that, new people are added by an admin in Settings → Team.
 *  - An account is an admin when a document exists at  admins/{their user id}.
 */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db, firebaseAuth, isFirebaseConfigured } from "@/firebase/config";
import { COLLECTIONS, SETUP_DOC_ID } from "@/firebase/collections";

/**
 * - "checking"      still loading
 * - "admin"         full access
 * - "not-admin"     signed in, but nobody has given this account access
 * - "rules-blocked" Firestore security rules haven't been published yet
 */
export type AccessStatus = "checking" | "admin" | "not-admin" | "rules-blocked";

/** null = still loading. "blocked" = can't tell because the rules aren't published. */
export type SetupState = null | "needed" | "done" | "blocked";

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  access: AccessStatus;
  setup: SetupState;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  createOwnerAccount: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  recheckAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const isPermissionError = (err: unknown) => (err as { code?: string })?.code === "permission-denied";

const setupRef = () => doc(db(), COLLECTIONS.settings, SETUP_DOC_ID);
const adminRef = (uid: string) => doc(db(), COLLECTIONS.admins, uid);

async function checkAccess(u: User): Promise<AccessStatus> {
  try {
    const snap = await getDoc(adminRef(u.uid));
    if (!snap.exists()) return "not-admin";
    // Admin added by hand in the console before setup existed? Mark setup as done
    // (so strangers can't use "Create account" to become an admin) and fill in
    // the details the Team list shows.
    try {
      const setup = await getDoc(setupRef());
      const data = snap.data();
      if (!setup.exists()) await setDoc(setupRef(), { ownerUid: u.uid, completedAt: serverTimestamp() });
      if (!data.email || !data.role || !data.createdAt) {
        await setDoc(
          adminRef(u.uid),
          {
            email: data.email || u.email || "",
            name: data.name || u.displayName || "",
            role: data.role || (setup.exists() ? "admin" : "owner"),
            createdAt: data.createdAt || serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch {
      /* not critical */
    }
    return "admin";
  } catch (err) {
    console.error("Admin check failed:", err);
    return isPermissionError(err) ? "rules-blocked" : "not-admin";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<AccessStatus>("checking");
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [setup, setSetup] = useState<SetupState>(null);
  // While the owner account is being created, skip the normal admin check
  // (the admin document doesn't exist until a moment later).
  const creatingOwner = useRef(false);

  // Who is signed in?
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(firebaseAuth(), async (u) => {
      if (creatingOwner.current) {
        setUser(u);
        return;
      }
      setAuthLoading(true);
      setUser(u);
      setAccess(u ? await checkAccess(u) : "checking");
      setAuthLoading(false);
    });
  }, []);

  // Has the owner account been created yet? (Public info — decides whether to show "Create account".)
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onSnapshot(
      setupRef(),
      (snap) => setSetup(snap.exists() ? "done" : "needed"),
      (err) => setSetup(isPermissionError(err) ? "blocked" : "done")
    );
  }, []);

  const value: AuthContextValue = {
    user,
    isAdmin: access === "admin",
    access,
    setup,
    loading: authLoading || (Boolean(user) && access === "checking"),

    signIn: async (email, password) => {
      await signInWithEmailAndPassword(firebaseAuth(), email, password);
    },

    /** First-time setup: create the owner account and make it an admin in one go. */
    createOwnerAccount: async (name, email, password) => {
      creatingOwner.current = true;
      setAccess("checking");
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
      } catch (err) {
        creatingOwner.current = false;
        throw err;
      }
      try {
        if (name) await updateProfile(cred.user, { displayName: name });
        const batch = writeBatch(db());
        batch.set(adminRef(cred.user.uid), {
          name,
          email,
          role: "owner",
          createdAt: serverTimestamp(),
        });
        batch.set(setupRef(), { ownerUid: cred.user.uid, completedAt: serverTimestamp() });
        await batch.commit();
        setAccess("admin");
        setSetup("done");
      } catch (err) {
        // Roll back so the email can be used again once the problem is fixed.
        await deleteUser(cred.user).catch(() => {});
        setUser(null);
        if (isPermissionError(err)) {
          throw new Error(
            "Firebase blocked the setup. Either an owner already exists, or the Firestore security rules haven't been published yet (see the box above)."
          );
        }
        throw err;
      } finally {
        creatingOwner.current = false;
      }
    },

    signOut: async () => {
      await firebaseSignOut(firebaseAuth());
    },

    resetPassword: async (email) => {
      await sendPasswordResetEmail(firebaseAuth(), email);
    },

    recheckAccess: async () => {
      if (!user) return;
      setAccess("checking");
      setAccess(await checkAccess(user));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
