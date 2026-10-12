// Firebase connection for your Astro website (read-only).
// Uses "firestore/lite" — smaller and faster, perfect for reading content.
import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";

const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
      authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
    });

export const db = getFirestore(app);
