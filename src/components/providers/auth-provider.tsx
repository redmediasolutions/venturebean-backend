"use client";

/**
 * Keeps track of who is logged in, and whether they are an admin.
 * An account is an admin when a document exists at  admins/{their user id}
 * in Firestore (see README → "Add yourself as an admin").
 */
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db, firebaseAuth, isFirebaseConfigured } from "@/firebase/config";
import { COLLECTIONS } from "@/firebase/collections";

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(firebaseAuth(), async (u) => {
      setLoading(true);
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db(), COLLECTIONS.admins, u.uid));
          setIsAdmin(snap.exists());
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
  }, []);

  const value: AuthContextValue = {
    user,
    isAdmin,
    loading,
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(firebaseAuth(), email, password);
    },
    signOut: async () => {
      await firebaseSignOut(firebaseAuth());
    },
    resetPassword: async (email) => {
      await sendPasswordResetEmail(firebaseAuth(), email);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
